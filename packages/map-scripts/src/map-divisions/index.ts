#!/usr/bin/env tsx
import type { Geometry, MultiPolygon, Polygon } from 'geojson';

import { DuckDBConnection } from '@duckdb/node-api';
import chalk from 'chalk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import type { DivisionItem, RegionMetadata } from './types';

import { boundingBoxes } from './bounding-boxes';
import { parseRegionData } from './content';
import { buildQuery, initializeDuckDB } from './duckdb';
import { saveFlatgeobuf } from './flatgeobuf';
import { convertToFeatureCollection } from './geojson';
import { getDivisionDataCache, saveDivisionDataCache } from './geojson-cache';
import { safelyCreateDirectory } from './utils';

// Parse command line arguments
const { values: args } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			short: 'r',
			default: process.cwd(),
		},
		'output-path': {
			type: 'string',
			short: 'o',
			default: './public/divisions',
		},
		'regions-path': {
			type: 'string',
			short: 'p',
			default: './packages/content/collections/regions',
		},
		'cache-path': {
			type: 'string',
			short: 'c',
			default: './temp/divisions',
		},
		'overture-url': {
			type: 'string',
			short: 'u',
			default: 's3://overturemaps-us-west-2/release/2025-06-25.0',
		},
	},
});

async function fetchDivisionData(
	db: DuckDBConnection,
	divisionIds: Set<string>,
	ancestorId: string,
): Promise<Map<string, DivisionItem>> {
	console.log(chalk.blue(`Fetching division data for ${chalk.cyan(String(divisionIds.size))} unique division IDs...`));

	// Check cache for each division ID first
	const divisionsById = new Map<string, DivisionItem>();
	const uncachedDivisionIds = new Set<string>();

	for (const divisionId of divisionIds) {
		const cached = await getDivisionDataCache(divisionId, args['cache-path']);

		if (cached) {
			console.log(chalk.gray(`  Using cached data for ${chalk.cyan(divisionId)}`));
			divisionsById.set(divisionId, cached);
		} else {
			uncachedDivisionIds.add(divisionId);
		}
	}

	// If all divisions are cached, return early
	if (uncachedDivisionIds.size === 0) {
		console.log(chalk.green(`All ${chalk.cyan(String(divisionIds.size))} divisions found in cache`));

		return divisionsById;
	}

	console.log(
		chalk.blue(`Fetching ${chalk.cyan(String(uncachedDivisionIds.size))} uncached divisions from Overture Maps...`),
	);

	// Get bounding box for this ancestor region
	const boundingBox = boundingBoxes[ancestorId];

	const query = buildQuery(args['overture-url'], uncachedDivisionIds, boundingBox);

	console.log(chalk.blue(`Running query against Overture Maps...`));

	try {
		const result = await db.run(query);

		console.log(chalk.green(`Found ${chalk.cyan(String(result.rowCount))} rows`));

		// Extract data from DuckDB result using getChunk
		const rows: Array<Record<string, unknown>> = [];

		for (let i = 0; i < result.chunkCount; i++) {
			const chunk = result.getChunk(i);
			const rowArrays = chunk.getRows();

			// With simplified query, we only have 2 columns: id (col_0) and geometry_geojson (col_1)
			for (const row of rowArrays) {
				rows.push({
					id: row[0],
					geometry_geojson: row[1],
				});
			}
		}

		console.log(chalk.green(`Found ${chalk.cyan(String(rows.length))} total divisions`));

		if (rows.length === 0) {
			console.warn(chalk.yellow(`No division data found for any division IDs`));

			return divisionsById;
		}

		// Process fetched data and add to cache
		for (const [index, row] of rows.entries()) {
			const id = (row.id ?? row.col_0) as string;

			// Log found matches for debugging
			console.log(chalk.gray(`  Match ${chalk.cyan(String(index + 1))}: ${chalk.cyan(id)}`));

			// Parse the GeoJSON geometry string
			let geometry: Geometry | undefined;

			try {
				const geometryJson = (row.geometry_geojson ?? row.col_1) as string;

				geometry = JSON.parse(geometryJson) as Geometry;
			} catch (error) {
				console.warn(chalk.yellow(`Failed to parse geometry for ${chalk.cyan(id)}:`), error);
				geometry = undefined;
			}

			if (geometry && ['MultiPolygon', 'Polygon'].includes(geometry.type)) {
				const divisionItem = {
					divisionId: id,
					geometry: geometry as Polygon | MultiPolygon,
				};

				divisionsById.set(id, divisionItem);

				// Save to cache
				try {
					await saveDivisionDataCache(id, geometry as Polygon | MultiPolygon, args['cache-path']);

					console.log(chalk.gray(`  Cached ${chalk.cyan(id)}`));
				} catch (error) {
					console.warn(chalk.yellow(`Failed to cache ${chalk.cyan(id)}:`), error);
				}
			}
		}

		return divisionsById;
	} catch (error) {
		console.log(chalk.red(`\nQuery failed`));
		console.error(chalk.red(`Error fetching batch data:`), error);

		throw error;
	}
}

async function processRegions(db: DuckDBConnection, regions: Array<RegionMetadata>) {
	console.log(chalk.magenta(`\n=== Processing ${chalk.cyan(String(regions.length))} regions ===`));

	try {
		// Check which regions already exist and filter them out
		const outputDir = path.join(args['root-path'], args['output-path']);

		await safelyCreateDirectory(outputDir);

		const regionsToProcess: Array<RegionMetadata> = [];

		for (const region of regions) {
			const filePath = path.join(outputDir, `${region.slug}.fgb`);

			try {
				await fs.access(filePath);
			} catch {
				regionsToProcess.push(region);
			}
		}

		if (regionsToProcess.length === 0) {
			console.log(chalk.green('All files already exist, skipping query'));

			return regions.length;
		}

		console.log(chalk.blue(`Processing ${chalk.cyan(String(regionsToProcess.length))}/${chalk.cyan(String(regions.length))} regions`));

		// Group regions by regionAncestorId for batched processing
		const regionsByAncestor = new Map<string, Array<RegionMetadata>>();

		for (const region of regionsToProcess) {
			const ancestorId = region.regionAncestorId;

			if (!regionsByAncestor.has(ancestorId)) {
				regionsByAncestor.set(ancestorId, []);
			}

			regionsByAncestor.get(ancestorId)!.push(region);
		}

		console.log(chalk.blue(`Processing ${chalk.cyan(String(regionsByAncestor.size))} region groups by ancestor...`));

		let successCount = regions.length - regionsToProcess.length;

		// Process each region group with its bounding box
		for (const [ancestorId, ancestorRegions] of regionsByAncestor) {
			console.log(
				chalk.magenta(`\n--- Processing ${chalk.cyan(ancestorId)} group (${chalk.cyan(String(ancestorRegions.length))} regions) ---`),
			);

			// Collect division IDs for this ancestor group
			const divisionIds = new Set<string>();

			for (const region of ancestorRegions) {
				for (const divisionId of region.divisionIds) {
					divisionIds.add(divisionId);
				}
			}

			// Fetch division data for this group
			const divisionsById = await fetchDivisionData(db, divisionIds, ancestorId);

			// Process each region in this group
			for (const region of ancestorRegions) {
				console.log(chalk.blue(`\nProcessing ${chalk.cyan(region.slug)}...`));

				try {
					// Collect division items for this region
					const divisionItems: Array<DivisionItem> = [];

					for (const divisionId of region.divisionIds) {
						const divisionItem = divisionsById.get(divisionId);

						if (divisionItem) {
							divisionItems.push(divisionItem);
						} else {
							console.warn(chalk.yellow(`No division data found for division ID: ${chalk.cyan(divisionId)}`));
						}
					}

					if (divisionItems.length === 0) {
						console.warn(chalk.yellow(`No division data found for any division IDs in ${chalk.cyan(region.slug)}`));
					} else {
						console.log(
							chalk.green(`Found ${chalk.cyan(String(divisionItems.length))}/${chalk.cyan(String(region.divisionIds.length))} division(s) for ${chalk.cyan(region.slug)}`),
						);

						const divisionFeatureCollection = convertToFeatureCollection(divisionItems);

						await saveFlatgeobuf(divisionFeatureCollection, region.slug, outputDir);

						console.log(chalk.green(`✓ Successfully processed ${chalk.cyan(region.slug)}`));

						successCount++;
					}
				} catch (error) {
					console.error(chalk.red(`✗ Failed to process ${chalk.cyan(region.slug)}:`), error);
				}
			}
		}

		return successCount;
	} catch (error) {
		console.error(chalk.red(`Error processing regions:`), error);
		throw error;
	}
}

async function mapDivisions() {
	console.log(
		chalk.blue(`🗺️  Fetching administrative divisions from Overture Maps using release: ${chalk.cyan(args['overture-url'])}...`),
	);

	try {
		// Load region data from regions collection
		const regions = await parseRegionData(args['root-path'], args['regions-path']);

		if (regions.length === 0) {
			console.log(chalk.yellow(`No regions with division IDs found in ${chalk.cyan(args['regions-path'])}.`));
			return;
		}

		// Initialize DuckDB connection
		const connection = await initializeDuckDB();

		const totalCount = regions.length;

		// Process all regions in a single batch
		const successCount = await processRegions(connection, regions);

		connection.disconnectSync();

		console.log(chalk.magenta(`\n=== Summary ===`));
		console.log(chalk.green(`Successfully processed: ${chalk.cyan(String(successCount))} / ${chalk.cyan(String(totalCount))} regions`));
		console.log(chalk.blue(`Output directory: ${chalk.cyan(args['output-path'])}`));

		if (successCount === totalCount) {
			console.log(chalk.green('🎉 All regions processed successfully!'));
		} else {
			console.log(chalk.yellow('⚠️  Some regions failed to process. Check the logs above.'));
			process.exit(1);
		}
	} catch (error) {
		console.error(chalk.red('❌ Script failed:'), error);
		process.exit(1);
	}
}

// Run the script
await mapDivisions();
