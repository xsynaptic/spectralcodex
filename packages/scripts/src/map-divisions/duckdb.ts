import type { GeometryBoundingBox } from '@spectralcodex/map-types';
import type { Geometry } from 'geojson';

import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import chalk from 'chalk';

import type { DivisionGeometry, DivisionItem } from './types';

import { getDivisionDataCache, saveDivisionDataCache } from './geojson-cache';

export async function initializeDuckDB(): Promise<DuckDBConnection> {
	console.log(chalk.blue('Initializing DuckDB...'));

	try {
		// Create DuckDB instance with in-memory database
		const instance = await DuckDBInstance.create(':memory:');

		// Connect to the instance
		const connection = await instance.connect();

		// Install and load spatial extension
		await connection.run(`
			INSTALL spatial;
			LOAD spatial;
			SET enable_object_cache=true;
			INSTALL httpfs;
			LOAD httpfs;
		`);

		console.log(chalk.green('DuckDB initialized with spatial and httpfs extensions'));

		return connection;
	} catch (error) {
		console.error(chalk.red('Failed to initialize DuckDB:'), error);

		throw error;
	}
}

// Query division_area table using unique division (GERS) IDs with bounding box optimization
// Convert WKB geometry to GeoJSON using DuckDB's spatial functions
// Only select the essential data we need: id and geometry
export function buildQuery(
	baseUrl: string,
	divisionIds: Set<string>,
	boundingBox?: GeometryBoundingBox,
) {
	const quotedIds = [...divisionIds].map((id) => `'${id}'`).join(', ');

	let query = `
		SELECT
			id,
			ST_AsGeoJSON(geometry) as geometry_geojson
		FROM read_parquet('${baseUrl.replace(/\/$/, '')}/theme=divisions/type=division_area/*', hive_partitioning=1)
		WHERE id IN (${quotedIds})`;

	// Add bounding box filter if provided
	if (boundingBox) {
		const { lngMin, latMin, lngMax, latMax } = boundingBox;

		query += `
			AND bbox.xmin > ${String(lngMin)}
			AND bbox.xmax < ${String(lngMax)}
			AND bbox.ymin > ${String(latMin)}
			AND bbox.ymax < ${String(latMax)}`;
	}

	return query + ';';
}

export async function fetchDivisionData({
	db,
	divisionIds,
	selectionBBox,
	cachePath,
	overtureUrl,
}: {
	db: DuckDBConnection;
	divisionIds: Set<string>;
	selectionBBox: GeometryBoundingBox;
	cachePath: string;
	overtureUrl: string;
}): Promise<Map<string, DivisionItem>> {
	console.log(
		chalk.blue(
			`Fetching division data for ${chalk.cyan(String(divisionIds.size))} unique division IDs...`,
		),
	);

	// Check cache for each division ID first
	const divisionsById = new Map<string, DivisionItem>();
	const uncachedDivisionIds = new Set<string>();

	for (const divisionId of divisionIds) {
		const cached = await getDivisionDataCache(divisionId, cachePath);

		if (cached) {
			console.log(chalk.gray(`  Using cached data for ${chalk.cyan(divisionId)}`));
			divisionsById.set(divisionId, cached);
		} else {
			uncachedDivisionIds.add(divisionId);
		}
	}

	// If all divisions are cached, return early
	if (uncachedDivisionIds.size === 0) {
		console.log(
			chalk.green(`All ${chalk.cyan(String(divisionIds.size))} divisions found in cache`),
		);

		return divisionsById;
	}

	console.log(
		chalk.blue(
			`Fetching ${chalk.cyan(String(uncachedDivisionIds.size))} uncached divisions from Overture Maps...`,
		),
	);

	const query = buildQuery(overtureUrl, uncachedDivisionIds, selectionBBox);

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
					geometry: geometry as DivisionGeometry,
				};

				divisionsById.set(id, divisionItem);

				// Save to cache
				try {
					await saveDivisionDataCache(id, geometry as DivisionGeometry, cachePath);

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
