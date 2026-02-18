import type { GeometryBoundingBox } from '@spectralcodex/shared/map';
import type { Geometry } from 'geojson';

import { DuckDBConnection, DuckDBInstance } from '@duckdb/node-api';
import chalk from 'chalk';

import type { DivisionGeometry, DivisionItem } from './types';

import { getDivisionDataCache, saveDivisionDataCache } from './geojson-cache';

export async function initializeDuckDB(): Promise<DuckDBConnection> {
	try {
		const instance = await DuckDBInstance.create(':memory:');
		const connection = await instance.connect();

		await connection.run(`
			INSTALL spatial;
			LOAD spatial;
			INSTALL httpfs;
			LOAD httpfs;
			SET enable_object_cache=true;
			SET http_timeout=12000;
			SET http_retries=5;
			SET s3_region='us-west-2';
		`);

		console.log(chalk.green('DuckDB initialized with spatial and httpfs extensions'));

		return connection;
	} catch (error) {
		console.error(chalk.red('Failed to initialize DuckDB:'), error);

		throw error;
	}
}

function buildQuery(baseUrl: string, divisionIds: Set<string>, boundingBox?: GeometryBoundingBox) {
	const setBBoxVars = boundingBox
		? `
		SET VARIABLE xmin = ${String(boundingBox.lngMin)};
		SET VARIABLE xmax = ${String(boundingBox.lngMax)};
		SET VARIABLE ymin = ${String(boundingBox.latMin)};
		SET VARIABLE ymax = ${String(boundingBox.latMax)};
		`
		: '';

	let query = `
		SELECT
			id,
			ST_AsGeoJSON(geometry) as geometry_geojson
		FROM read_parquet('${baseUrl.replace(/\/$/, '')}/theme=divisions/type=division_area/*', hive_partitioning=1)`;

	const conditions: Array<string> = [];

	if (boundingBox) {
		conditions.push(
			`bbox.xmin > getvariable('xmin')`,
			`bbox.xmax < getvariable('xmax')`,
			`bbox.ymin > getvariable('ymin')`,
			`bbox.ymax < getvariable('ymax')`,
		);
	}

	if (divisionIds.size === 1) {
		const id = [...divisionIds][0] ?? '';
		conditions.push(`id = '${id}'`);
	} else {
		const quotedIds = [...divisionIds].map((id) => `'${id}'`).join(', ');
		conditions.push(`id IN (${quotedIds})`);
	}

	query += `
		WHERE ${conditions.join('\n\t\t\tAND ')}`;

	return setBBoxVars + query + ';';
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
