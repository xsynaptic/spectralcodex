import type { GeometryBoundingBox } from '@spectralcodex/map-types';

import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import chalk from 'chalk';

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
