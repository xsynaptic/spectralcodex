#!/usr/bin/env tsx
import type { Geometry, MultiPolygon, Polygon } from 'geojson';

import { DuckDBConnection } from '@duckdb/node-api';
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
	console.log(`Fetching division data for ${String(divisionIds.size)} unique division IDs...`);

	// Check cache for each division ID first
	const divisionsById = new Map<string, DivisionItem>();
	const uncachedDivisionIds = new Set<string>();

	for (const divisionId of divisionIds) {
		const cached = await getDivisionDataCache(divisionId, args['cache-path']);

		if (cached) {
			console.log(`  Using cached data for ${divisionId}`);
			divisionsById.set(divisionId, cached);
		} else {
			uncachedDivisionIds.add(divisionId);
		}
	}

	// If all divisions are cached, return early
	if (uncachedDivisionIds.size === 0) {
		console.log(`All ${String(divisionIds.size)} divisions found in cache`);

		return divisionsById;
	}

	console.log(
		`Fetching ${String(uncachedDivisionIds.size)} uncached divisions from Overture Maps...`,
	);

	// Get bounding box for this ancestor region
	const boundingBox = boundingBoxes[ancestorId];

	const query = buildQuery(args['overture-url'], uncachedDivisionIds, boundingBox);

	console.log(`Running query against Overture Maps...`);

	try {
		const result = await db.run(query);

		console.log(`Found ${String(result.rowCount)} rows`);

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

		console.log(`Found ${String(rows.length)} total divisions`);

		if (rows.length === 0) {
			console.warn(`No division data found for any division IDs`);

			return divisionsById;
		}

		// Process fetched data and add to cache
		for (const [index, row] of rows.entries()) {
			const id = (row.id ?? row.col_0) as string;

			// Log found matches for debugging
			console.log(`  Match ${String(index + 1)}: ${id}`);

			// Parse the GeoJSON geometry string
			let geometry: Geometry | undefined;

			try {
				const geometryJson = (row.geometry_geojson ?? row.col_1) as string;

				geometry = JSON.parse(geometryJson) as Geometry;
			} catch (error) {
				console.warn(`Failed to parse geometry for ${id}:`, error);
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

					console.log(`  Cached ${id}`);
				} catch (error) {
					console.warn(`Failed to cache ${id}:`, error);
				}
			}
		}

		return divisionsById;
	} catch (error) {
		console.log(`\nQuery failed`);
		console.error(`Error fetching batch data:`, error);

		throw error;
	}
}

async function processRegions(db: DuckDBConnection, regions: Array<RegionMetadata>) {
	console.log(`\n=== Processing ${String(regions.length)} regions ===`);

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
			console.log('All files already exist, skipping query');

			return regions.length;
		}

		console.log(`Processing ${String(regionsToProcess.length)}/${String(regions.length)} regions`);

		// Group regions by regionAncestorId for batched processing
		const regionsByAncestor = new Map<string, Array<RegionMetadata>>();

		for (const region of regionsToProcess) {
			const ancestorId = region.regionAncestorId;

			if (!regionsByAncestor.has(ancestorId)) {
				regionsByAncestor.set(ancestorId, []);
			}

			regionsByAncestor.get(ancestorId)!.push(region);
		}

		console.log(`Processing ${String(regionsByAncestor.size)} region groups by ancestor...`);

		let successCount = regions.length - regionsToProcess.length;

		// Process each region group with its bounding box
		for (const [ancestorId, ancestorRegions] of regionsByAncestor) {
			console.log(
				`\n--- Processing ${ancestorId} group (${String(ancestorRegions.length)} regions) ---`,
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
				console.log(`\nProcessing ${region.slug}...`);

				try {
					// Collect division items for this region
					const divisionItems: Array<DivisionItem> = [];

					for (const divisionId of region.divisionIds) {
						const divisionItem = divisionsById.get(divisionId);

						if (divisionItem) {
							divisionItems.push(divisionItem);
						} else {
							console.warn(`No division data found for division ID: ${divisionId}`);
						}
					}

					if (divisionItems.length === 0) {
						console.warn(`No division data found for any division IDs in ${region.slug}`);
					} else {
						console.log(
							`Found ${String(divisionItems.length)}/${String(region.divisionIds.length)} division(s) for ${region.slug}`,
						);

						const divisionFeatureCollection = convertToFeatureCollection(divisionItems);

						await saveFlatgeobuf(divisionFeatureCollection, region.slug, outputDir);

						console.log(`✓ Successfully processed ${region.slug}`);

						successCount++;
					}
				} catch (error) {
					console.error(`✗ Failed to process ${region.slug}:`, error);
				}
			}
		}

		return successCount;
	} catch (error) {
		console.error(`Error processing regions:`, error);
		throw error;
	}
}

async function mapDivisions() {
	console.log(
		`🗺️  Fetching administrative divisions from Overture Maps using release: ${args['overture-url']}...`,
	);

	try {
		// Load region data from regions collection
		const regions = await parseRegionData(args['root-path'], args['regions-path']);

		if (regions.length === 0) {
			console.log(`No regions with division IDs found in ${args['regions-path']}.`);
			return;
		}

		// Initialize DuckDB connection
		const connection = await initializeDuckDB();

		const totalCount = regions.length;

		// Process all regions in a single batch
		const successCount = await processRegions(connection, regions);

		connection.disconnectSync();

		console.log(`\n=== Summary ===`);
		console.log(`Successfully processed: ${String(successCount)} / ${String(totalCount)} regions`);
		console.log(`Output directory: ${args['output-path']}`);

		if (successCount === totalCount) {
			console.log('🎉 All regions processed successfully!');
		} else {
			console.log('⚠️  Some regions failed to process. Check the logs above.');
			process.exit(1);
		}
	} catch (error) {
		console.error('❌ Script failed:', error);
		process.exit(1);
	}
}

// Run the script
await mapDivisions();
