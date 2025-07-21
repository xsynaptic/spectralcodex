#!/usr/bin/env tsx
import type { Geometry, MultiPolygon, Polygon } from 'geojson';

import { DuckDBConnection } from '@duckdb/node-api';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { DivisionItem, RegionMetadata } from './types';

import { getDivisionDataCache, saveCachedGeoJSON } from './cache';
import { parseRegionData } from './content';
import { initializeDuckDB } from './duckdb-setup';
import { saveFlatgeobuf } from './flatgeobuf';
import { convertToFeatureCollection } from './geojson';
import { safelyCreateDirectory } from './utils';

// Parse command line arguments
const args = process.argv.slice(2);

const outputPathIndex = args.indexOf('--output-path');
const regionsPathIndex = args.indexOf('--regions-path');
const cachePathIndex = args.indexOf('--cache-path');

const OUTPUT_PATH = args[outputPathIndex + 1] ?? './public/divisions';
const REGIONS_PATH = args[regionsPathIndex + 1] ?? './packages/content/collections/regions';
const CACHE_PATH = args[cachePathIndex + 1] ?? './temp/divisions';

const OVERTURE_RELEASE = '2025-06-25.0';
const OVERTURE_BASE_URL = `s3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}`;

// Bounding boxes for top-level/ancestral regions [west, south, east, north]
// TODO: this is just a proof-of-concept, we need to get actual bounding box data
// And test more thoroughly
const REGION_BOUNDING_BOXES: Record<string, [number, number, number, number]> = {
	canada: [-141, 42, -52, 84],
	china: [73, 18, 135, 54],
	'hong-kong': [113.8, 22.1, 114.5, 22.6],
	japan: [129, 24, 146, 46],
	malaysia: [99, 1, 120, 7],
	philippines: [116, 5, 127, 19],
	singapore: [103.6, 1.2, 104, 1.5],
	'south-korea': [125, 33, 130, 39],
	taiwan: [119.3, 21.9, 122, 25.3],
	thailand: [97, 5.6, 106, 20.5],
	'united-states': [-180, 19, -66, 72],
	vietnam: [102, 8, 110, 24],
};

// Query division_area table using unique division IDs (GERS IDs) with bounding box optimization
// Convert WKB geometry to GeoJSON using DuckDB's spatial functions
// Only select the essential data we need: id and geometry
function buildBatchQuery(divisionIds: Set<string>, boundingBox?: [number, number, number, number]) {
	const quotedIds = [...divisionIds].map((id) => `'${id}'`).join(', ');

	let query = `
		SELECT 
			id,
			ST_AsGeoJSON(geometry) as geometry_geojson
		FROM read_parquet('${OVERTURE_BASE_URL}/theme=divisions/type=division_area/*')
		WHERE id IN (${quotedIds})`;

	// Add bounding box filter if provided
	if (boundingBox) {
		const [west, south, east, north] = boundingBox;

		query += `
			AND bbox.xmin > ${String(west)}
			AND bbox.xmax < ${String(east)}
			AND bbox.ymin > ${String(south)}
			AND bbox.ymax < ${String(north)}`;
	}

	return query + ';';
}

async function fetchDivisionData(
	db: DuckDBConnection,
	divisionIds: Set<string>,
	boundingBox?: [number, number, number, number],
): Promise<Map<string, DivisionItem>> {
	console.log(`Fetching division data for ${String(divisionIds.size)} unique division IDs...`);

	// Check cache for each division ID first
	const divisionsById = new Map<string, DivisionItem>();
	const uncachedDivisionIds = new Set<string>();

	for (const divisionId of divisionIds) {
		const cached = await getDivisionDataCache(divisionId, CACHE_PATH);

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

	const query = buildBatchQuery(uncachedDivisionIds, boundingBox);

	console.log(`Executing batch query against Overture Maps...`);
	if (boundingBox) {
		console.log(`Using bounding box: [${boundingBox.join(', ')}]`);
	}
	console.log(`This may take several minutes for large datasets. Please wait...`);

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
					await saveCachedGeoJSON(id, geometry as Polygon | MultiPolygon, CACHE_PATH);

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
		const outputDir = path.join(process.cwd(), OUTPUT_PATH);

		await safelyCreateDirectory(outputDir);

		const regionsToProcess: Array<RegionMetadata> = [];

		for (const region of regions) {
			const filePath = path.join(outputDir, `${region.slug}.fgb`);

			try {
				await fs.access(filePath);

				console.log(`Skipping ${region.slug} (already exists)`);
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

			// Get bounding box for this ancestor region
			const boundingBox = REGION_BOUNDING_BOXES[ancestorId];

			// Fetch division data for this group
			const divisionsById = await fetchDivisionData(db, divisionIds, boundingBox);

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
					}

					const divisionFeatureCollection = convertToFeatureCollection(divisionItems);

					await saveFlatgeobuf(divisionFeatureCollection, region.slug, OUTPUT_PATH);

					console.log(`✓ Successfully processed ${region.slug}`);

					successCount++;
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
		`🗺️  Fetching administrative divisions from Overture Maps using release: ${OVERTURE_RELEASE}...`,
	);

	try {
		// Load region data from regions collection
		const regions = await parseRegionData(REGIONS_PATH);

		if (regions.length === 0) {
			console.log(`No regions with division IDs found in ${REGIONS_PATH}.`);
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
		console.log(`Output directory: ${OUTPUT_PATH}`);

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
