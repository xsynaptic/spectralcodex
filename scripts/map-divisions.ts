#!/usr/bin/env tsx
import type { FeatureCollection, Geometry } from 'geojson';

import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import { feature, featureCollection } from '@turf/helpers';
import { geojson } from 'flatgeobuf';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

// Parse command line arguments
const args = process.argv.slice(2);

const outputPathIndex = args.indexOf('--output-path');
const divisionsPathIndex = args.indexOf('--divisions-path');

const OUTPUT_PATH = args[outputPathIndex + 1] ?? './public/divisions';
const DIVISIONS_PATH = args[divisionsPathIndex + 1] ?? './packages/content/data/divisions.yaml';

const OVERTURE_RELEASE = '2025-06-25.0';
const OVERTURE_BASE_URL = `s3://overturemaps-us-west-2/release/${OVERTURE_RELEASE}`;

interface DivisionMetadata {
	slug: string;
	gersId: string;
}

interface DivisionItem {
	id: string;
	slug: string;
	geometry: Geometry | undefined;
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
 * Load YAML data from the configured divisions data path
 */
async function parseDivisionIds() {
	console.log('Scanning geodata.yaml for items with GERS IDs...');

	try {
		const filePath = path.join(process.cwd(), DIVISIONS_PATH);
		const fileContent = await fs.readFile(filePath, 'utf8');
		const geodataIds = parse(fileContent) as Record<string, string>;

		// Convert Record to array of GeodataItem objects
		const items = Object.entries(geodataIds).map(([slug, gersId]) => ({
			slug,
			gersId,
		})) satisfies Array<DivisionMetadata>;

		console.log(`Found ${items.length.toString()} items with GERS IDs`);

		return items;
	} catch (error) {
		console.error(`Failed to load YAML data from ${DIVISIONS_PATH}:`, error);

		throw new Error(`Failed to load YAML data from ${DIVISIONS_PATH}`);
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
function buildBatchQuery(items: Array<DivisionMetadata>) {
	const gersIds = items.map((item) => `'${item.gersId}'`).join(', ');

	return `
		SELECT 
			id,
			ST_AsGeoJSON(geometry) as geometry_geojson
		FROM read_parquet('${OVERTURE_BASE_URL}/theme=divisions/type=division_area/*')
		WHERE id IN (${gersIds});
	`;
}

async function fetchDivisionData(
	db: DuckDBConnection,
	items: Array<DivisionMetadata>,
): Promise<Array<DivisionItem>> {
	console.log(`Fetching division data for ${items.length.toString()} items...`);

	const query = buildBatchQuery(items);

	console.log(`Executing batch query against Overture Maps...`);
	console.log(`This may take several minutes for large datasets. Please wait...`);

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

		console.log(`Found ${rows.length.toString()} total divisions`);

		if (rows.length === 0) {
			console.warn(`No division data found for any items`);
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
				slug,
				geometry,
			};
		});
	} catch (error) {
		console.log(`\nQuery failed`);
		console.error(`Error fetching batch data:`, error);

		throw error;
	}
}

function convertToFeatureCollection(divisionItems: Array<DivisionItem>) {
	if (divisionItems.length === 0) {
		return featureCollection([]) satisfies FeatureCollection;
	}

	const features = divisionItems.map((divisionItem) =>
		feature(divisionItem.geometry!, undefined, {
			id: divisionItem.id,
		}),
	);

	return featureCollection(features) satisfies FeatureCollection;
}

async function saveFlatgeobuf(geojsonData: FeatureCollection, slug: string) {
	const outputDir = path.join(process.cwd(), OUTPUT_PATH);

	await ensureOutputDirectory(outputDir);

	const filePath = path.join(outputDir, `${slug}.fgb`);

	try {
		const fgbBuffer = geojson.serialize(geojsonData);

		await fs.writeFile(filePath, fgbBuffer);

		console.log(`Saved FlatGeobuf to: ${filePath}`);
	} catch (error) {
		console.error(`Failed to serialize FlatGeobuf for ${slug}:`, error);
		throw error;
	}
}

async function processItems(db: DuckDBConnection, items: Array<DivisionMetadata>) {
	console.log(`\n=== Processing ${items.length.toString()} items ===`);

	try {
		// Check which items already exist and filter them out
		const outputDir = path.join(process.cwd(), OUTPUT_PATH);
		await ensureOutputDirectory(outputDir);

		const itemsToProcess = [];
		for (const item of items) {
			const filePath = path.join(outputDir, `${item.slug}.fgb`);
			try {
				await fs.access(filePath);
				console.log(`Skipping ${item.slug} (already exists)`);
			} catch {
				itemsToProcess.push(item);
			}
		}

		if (itemsToProcess.length === 0) {
			console.log('All files already exist, skipping query');
			return items.length;
		}

		console.log(`Querying for ${String(itemsToProcess.length)}/${String(items.length)} items`);

		// Fetch all division data in a single batch query
		const divisionData = await fetchDivisionData(db, itemsToProcess);

		// Group divisions by slug
		const divisionsBySlug = new Map<string, Array<DivisionItem>>();

		for (const divisionDatum of divisionData) {
			if (!divisionsBySlug.has(divisionDatum.slug)) {
				divisionsBySlug.set(divisionDatum.slug, []);
			}
			divisionsBySlug.get(divisionDatum.slug)!.push(divisionDatum);
		}

		// Process each item and save individual GeoJSON files
		let successCount = items.length - itemsToProcess.length; // Count already existing files as successful

		for (const item of itemsToProcess) {
			console.log(`\nProcessing ${item.slug}...`);

			try {
				const divisionItems = divisionsBySlug.get(item.slug) ?? [];

				if (divisionItems.length === 0) {
					console.warn(`No division data found for ${item.slug}`);
				}

				const geojsonData = convertToFeatureCollection(divisionItems);

				await saveFlatgeobuf(geojsonData, item.slug);

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

async function mapDivisions() {
	console.log(
		`🗺️  Fetching administrative divisions from Overture Maps using release: ${OVERTURE_RELEASE}...`,
	);

	try {
		// Load geodata items from YAML
		const items = await parseDivisionIds();

		if (items.length === 0) {
			console.log(`No items with GERS IDs found in ${DIVISIONS_PATH}.`);
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
		console.log(`Output directory: ${OUTPUT_PATH}`);

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
await mapDivisions();
