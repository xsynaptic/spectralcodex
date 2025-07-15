#!/usr/bin/env tsx
import type { FeatureCollection, Geometry } from 'geojson';

import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { feature, featureCollection } from '@turf/helpers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const OVERTURE_RELEASE = '2025-06-25.0';
const OVERTURE_BASE_URL = `s3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}`;
const OUTPUT_BASE_DIR = './temp';
const CONTENT_GEODATA_PATH = './packages/content/data/geodata.yaml';

interface GeodataItem {
	slug: string;
	gersId: string;
}

interface SimplifiedBoundary {
	id: string;
	geometry: Geometry | undefined;
	slug: string;
}

interface GeodataProperties {
	slug: string;
}

type GeodataFeatureCollection = FeatureCollection<Geometry, GeodataProperties>;

async function ensureOutputDirectory(dir: string) {
	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
		console.log(`Created output directory: ${dir}`);
	}
}

/**
 * Load YAML data from the configured content data path
 */
async function parseContentGeodataIds() {
	console.log('Scanning geodata.yaml for items with GERS IDs...');

	try {
		const filePath = path.join(process.cwd(), CONTENT_GEODATA_PATH);
		const fileContent = await fs.readFile(filePath, 'utf8');
		const geodataIds = parse(fileContent) as Record<string, string>;

		// Convert Record to array of GeodataItem objects
		const items = Object.entries(geodataIds).map(([slug, gersId]) => ({
			slug,
			gersId,
		})) satisfies Array<GeodataItem>;

		console.log(`Found ${items.length.toString()} items with GERS IDs`);

		return items;
	} catch (error) {
		console.error(`Failed to load YAML data from ${CONTENT_GEODATA_PATH}:`, error);

		throw new Error(`Failed to load YAML data from ${CONTENT_GEODATA_PATH}`);
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

// Query division_area table using multiple Overture Maps IDs in a single query
// Convert WKB geometry to GeoJSON using DuckDB's spatial functions
// Only select the essential data we need: id and geometry
function buildBatchQuery(items: Array<GeodataItem>) {
	const gersIds = items.map((item) => `'${item.gersId}'`).join(', ');

	return `
		SELECT 
			id,
			ST_AsGeoJSON(geometry) as geometry_geojson
		FROM read_parquet('${OVERTURE_BASE_URL}/theme=divisions/type=division_area/*')
		WHERE id IN (${gersIds});
	`;
}

async function fetchBoundaryDataBatch(
	db: DuckDBConnection,
	items: Array<GeodataItem>,
): Promise<Array<SimplifiedBoundary>> {
	console.log(`Fetching boundary data for ${items.length.toString()} items...`);

	const query = buildBatchQuery(items);

	console.log(`Executing batch query...`);

	try {
		const result = await db.run(query);

		console.log(`Found ${result.rowCount.toString()} rows`);

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

		console.log(`Found ${rows.length.toString()} total boundaries`);

		if (rows.length === 0) {
			console.warn(`No boundary data found for any items`);
			return [];
		}

		// Create a map of gersId to slug for lookup
		const gersIdToSlug = new Map<string, string>();

		for (const item of items) {
			gersIdToSlug.set(item.gersId, item.slug);
		}

		return rows.map((row, index) => {
			const id = (row.id ?? row.col_0) as string;
			const slug = gersIdToSlug.get(id) ?? 'unknown';

			// Log found matches for debugging
			console.log(`  Match ${(index + 1).toString()}: ${id} (${slug})`);

			// Parse the GeoJSON geometry string
			let geometry: Geometry | undefined;

			try {
				const geometryJson = (row.geometry_geojson ?? row.col_1) as string;

				geometry = JSON.parse(geometryJson) as Geometry;
			} catch (error) {
				console.warn(`Failed to parse geometry for ${id}:`, error);

				geometry = undefined;
			}

			return {
				id,
				geometry,
				slug,
			};
		});
	} catch (error) {
		console.error(`Error fetching batch data:`, error);

		throw error;
	}
}

function convertToGeoJSON(boundaries: Array<SimplifiedBoundary>) {
	if (boundaries.length === 0) {
		return featureCollection([]) satisfies GeodataFeatureCollection;
	}

	const features = boundaries.map((boundary) =>
		feature(boundary.geometry!, { slug: boundary.slug } satisfies GeodataProperties, {
			id: boundary.id,
		}),
	);

	return featureCollection(features) satisfies GeodataFeatureCollection;
}

async function saveGeoJSON(geojson: FeatureCollection, slug: string) {
	const outputDir = path.join(OUTPUT_BASE_DIR, 'geodata');

	await ensureOutputDirectory(outputDir);

	const filePath = path.join(outputDir, `${slug}.geojson`);

	await fs.writeFile(filePath, JSON.stringify(geojson, undefined, 2));
	console.log(`Saved GeoJSON to: ${filePath}`);
}

async function processItems(db: DuckDBConnection, items: Array<GeodataItem>) {
	console.log(`\n=== Processing ${items.length.toString()} items ===`);

	try {
		// Fetch all boundary data in a single batch query
		const allBoundaries = await fetchBoundaryDataBatch(db, items);

		// Group boundaries by slug
		const boundariesBySlug = new Map<string, Array<SimplifiedBoundary>>();

		for (const boundary of allBoundaries) {
			if (!boundariesBySlug.has(boundary.slug)) {
				boundariesBySlug.set(boundary.slug, []);
			}
			boundariesBySlug.get(boundary.slug)!.push(boundary);
		}

		// Process each item and save individual GeoJSON files
		let successCount = 0;

		for (const item of items) {
			console.log(`\nProcessing ${item.slug}...`);
			try {
				const boundaries = boundariesBySlug.get(item.slug) ?? [];

				if (boundaries.length === 0) {
					console.warn(`No boundary data found for ${item.slug}`);
				}

				const geojson = convertToGeoJSON(boundaries);

				await saveGeoJSON(geojson, item.slug);

				console.log(`✓ Successfully processed ${item.slug}`);

				successCount++;
			} catch (error) {
				console.error(`✗ Failed to process ${item.slug}:`, error);
			}
		}

		return successCount;
	} catch (error) {
		console.error(`Error processing items:`, error);

		throw error;
	}
}

async function fetchGeodata() {
	console.log(
		`🗺️  Fetching administrative boundaries from Overture Maps using release: ${OVERTURE_RELEASE}...`,
	);

	try {
		// Load geodata items from YAML
		const items = await parseContentGeodataIds();

		if (items.length === 0) {
			console.log('No items with GERS IDs found in geodata.yaml.');
			return;
		}

		// Initialize DuckDB connection
		const connection = await initializeDuckDB();

		const totalCount = items.length;

		// Process all items in a single batch
		const successCount = await processItems(connection, items);

		connection.disconnectSync();

		console.log(`\n=== Summary ===`);
		console.log(
			`Successfully processed: ${successCount.toString()}/${totalCount.toString()} items`,
		);
		console.log(`Output directory: ${OUTPUT_BASE_DIR}/geodata`);

		if (successCount === totalCount) {
			console.log('🎉 All items processed successfully!');
		} else {
			console.log('⚠️  Some items failed to process. Check the logs above.');
			process.exit(1);
		}
	} catch (error) {
		console.error('❌ Script failed:', error);
		process.exit(1);
	}
}

// Run the script
await fetchGeodata();
