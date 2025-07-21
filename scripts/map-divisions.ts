#!/usr/bin/env tsx
import type { FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';

import { parseFrontmatter } from '@astrojs/markdown-remark';
import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { feature, featureCollection } from '@turf/helpers';
import { union } from '@turf/turf';
import { geojson } from 'flatgeobuf';
import fs from 'node:fs/promises';
import path from 'node:path';

// Parse command line arguments
const args = process.argv.slice(2);

const outputPathIndex = args.indexOf('--output-path');
const regionsPathIndex = args.indexOf('--regions-path');

const OUTPUT_PATH = args[outputPathIndex + 1] ?? './public/divisions';
const REGIONS_PATH = args[regionsPathIndex + 1] ?? './packages/content/collections/regions';

const OVERTURE_RELEASE = '2025-06-25.0';
const OVERTURE_BASE_URL = `s3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}`;

interface RegionMetadata {
	slug: string;
	divisionIds: Array<string>;
}

interface DivisionItem {
	divisionId: string;
	geometry: Polygon | MultiPolygon;
}

async function ensureOutputDirectory(dir: string) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });

		console.log(`Created output directory: ${dir}`);
	}
}

/**
 * Load frontmatter from the regions collection
 */
async function parseRegionData() {
	console.log('Scanning regions collection for divisionId in frontmatter...');

	const regions: Array<RegionMetadata> = [];

	async function scanDirectory(dir: string): Promise<void> {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				const dirPath = path.join(dir, entry.name);

				await scanDirectory(dirPath);
			} else if (entry.name.endsWith('.mdx')) {
				const filePath = path.join(dir, entry.name);
				const slug = entry.name.replace('.mdx', '');

				try {
					const fileContent = await fs.readFile(filePath, 'utf8');
					const { frontmatter } = parseFrontmatter(fileContent);

					if (frontmatter.divisionId) {
						// Handle divisionId as string or array
						const divisionIdValue = frontmatter.divisionId as string | Array<string>;
						const divisionIds = Array.isArray(divisionIdValue)
							? divisionIdValue.filter((id): id is string => typeof id === 'string')
							: [divisionIdValue].filter((id): id is string => typeof id === 'string');

						if (divisionIds.length > 0) {
							regions.push({
								slug,
								divisionIds,
							});
						}
					}
				} catch (error) {
					console.warn(`Failed to parse frontmatter for ${filePath}:`, error);
				}
			}
		}
	}

	try {
		const regionsPath = path.join(process.cwd(), REGIONS_PATH);

		await scanDirectory(regionsPath);

		console.log(`Found ${String(regions.length)} regions with division IDs`);

		return regions;
	} catch (error) {
		console.error(`Failed to scan regions directory ${REGIONS_PATH}:`, error);

		throw new Error(`Failed to scan regions directory ${REGIONS_PATH}`);
	}
}

async function initializeDuckDB(): Promise<DuckDBConnection> {
	console.log('Initializing DuckDB...');

	try {
		// Create DuckDB instance with in-memory database
		const instance = await DuckDBInstance.create(':memory:');

		// Connect to the instance
		const connection = await instance.connect();

		// Install and load spatial extension
		await connection.run(`
			INSTALL spatial;
			LOAD spatial;
			INSTALL httpfs;
			LOAD httpfs;
		`);

		console.log('DuckDB initialized with spatial and httpfs extensions');

		return connection;
	} catch (error) {
		console.error('Failed to initialize DuckDB:', error);

		throw error;
	}
}

// Query division_area table using unique division IDs (GERS IDs)
// Convert WKB geometry to GeoJSON using DuckDB's spatial functions
// Only select the essential data we need: id and geometry
function buildBatchQuery(divisionIds: Set<string>) {
	const quotedIds = [...divisionIds].map((id) => `'${id}'`).join(', ');

	return `
		SELECT 
			id,
			ST_AsGeoJSON(geometry) as geometry_geojson
		FROM read_parquet('${OVERTURE_BASE_URL}/theme=divisions/type=division_area/*')
		WHERE id IN (${quotedIds});
	`;
}

async function fetchDivisionData(
	db: DuckDBConnection,
	divisionIds: Set<string>,
): Promise<Map<string, DivisionItem>> {
	console.log(`Fetching division data for ${String(divisionIds.size)} unique division IDs...`);

	const query = buildBatchQuery(divisionIds);

	console.log(`Executing batch query against Overture Maps...`);
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
			return new Map();
		}

		// Create a map of division ID to division item
		const divisionsById = new Map<string, DivisionItem>();

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
				divisionsById.set(id, {
					divisionId: id,
					geometry: geometry as Polygon | MultiPolygon,
				});
			}
		}

		return divisionsById;
	} catch (error) {
		console.log(`\nQuery failed`);
		console.error(`Error fetching batch data:`, error);

		throw error;
	}
}

function convertToFeatureCollection(divisionItems: Array<DivisionItem>) {
	if (divisionItems.length === 1 && divisionItems[0]) {
		return featureCollection([
			feature(divisionItems[0].geometry, undefined, {
				id: divisionItems[0].divisionId,
			}),
		]);
	}

	if (divisionItems.length > 1) {
		const divisionItemsUnion = union(
			featureCollection(
				divisionItems.map((divisionItem) =>
					feature(divisionItem.geometry, undefined, {
						id: divisionItem.divisionId,
					}),
				),
			),
		);

		if (divisionItemsUnion) {
			return featureCollection([feature(divisionItemsUnion.geometry)]);
		}
	}

	return featureCollection([]);
}

async function saveFlatgeobuf(geojsonData: FeatureCollection, slug: string) {
	const outputDir = path.join(process.cwd(), OUTPUT_PATH);

	await ensureOutputDirectory(outputDir);

	const filePath = path.join(outputDir, `${slug}.fgb`);

	try {
		// Attempt to enforce a standard projection, WGS84 (EPSG:4326)
		const fgbBuffer = geojson.serialize(geojsonData, 4326);

		await fs.writeFile(filePath, fgbBuffer);

		console.log(`Saved FlatGeobuf to: ${filePath}`);
	} catch (error) {
		console.error(`Failed to serialize FlatGeobuf for ${slug}:`, error);
		throw error;
	}
}

async function processRegions(db: DuckDBConnection, regions: Array<RegionMetadata>) {
	console.log(`\n=== Processing ${String(regions.length)} regions ===`);

	try {
		// Check which regions already exist and filter them out
		const outputDir = path.join(process.cwd(), OUTPUT_PATH);

		await ensureOutputDirectory(outputDir);

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

		// Collect all unique division IDs needed for regions that don't exist yet
		const uniqueDivisionIds = new Set<string>();

		for (const region of regionsToProcess) {
			for (const divisionId of region.divisionIds) {
				uniqueDivisionIds.add(divisionId);
			}
		}

		console.log(`Querying for ${String(uniqueDivisionIds.size)} unique division IDs`);

		// Fetch all division data in a single batch query
		const divisionsById = await fetchDivisionData(db, uniqueDivisionIds);

		// Process each region and save individual FGB files
		let successCount = regions.length - regionsToProcess.length; // Count already existing files as successful

		for (const region of regionsToProcess) {
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

				const geojsonData = convertToFeatureCollection(divisionItems);

				await saveFlatgeobuf(geojsonData, region.slug);

				console.log(`✓ Successfully processed ${region.slug}`);

				successCount++;
			} catch (error) {
				console.error(`✗ Failed to process ${region.slug}:`, error);
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
		const regions = await parseRegionData();

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
