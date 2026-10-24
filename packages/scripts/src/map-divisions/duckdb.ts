import type { DuckDBConnection } from '@duckdb/node-api';
import type { GeometryBoundingBox } from '@spectralcodex/shared/schemas';
import type { Geometry } from 'geojson';

import { DuckDBInstance } from '@duckdb/node-api';

import type { DivisionGeometry, DivisionItem } from '#map-divisions/types.ts';

import { getDivisionDataCache, saveDivisionDataCache } from '#map-divisions/geojson-cache.ts';
import { formatCount, formatError, log } from '#shared/cli-output.ts';

interface DivisionRow {
	areaId: string;
	geometryGeojson: string;
	parentDivisionId: string;
}

export async function fetchDivisionData({
	cachePath,
	db,
	divisionIds,
	overtureUrl,
	selectionBBox,
}: {
	cachePath: string;
	db: DuckDBConnection;
	divisionIds: Set<string>;
	overtureUrl: string;
	selectionBBox: GeometryBoundingBox;
}): Promise<Map<string, DivisionItem>> {
	const { cached: divisionsById, uncachedIds } = await readCachedDivisions(divisionIds, cachePath);

	if (uncachedIds.size === 0) return divisionsById;

	log.step(`Querying Overture Maps for ${formatCount(uncachedIds.size)} uncached divisions...`);

	const rows = await runDivisionQuery(db, buildQuery(overtureUrl, uncachedIds, selectionBBox));

	if (rows.length === 0) {
		log.warn('No division data found for any division IDs');

		return divisionsById;
	}

	log.detail(`Found ${formatCount(rows.length)} divisions`);

	for (const row of rows) {
		const id = uncachedIds.has(row.areaId) ? row.areaId : row.parentDivisionId;

		const geometry = parseDivisionGeometry(row, id);

		if (!geometry) continue;

		divisionsById.set(id, { divisionId: id, geometry });

		await cacheDivisionGeometry(id, geometry, cachePath);
	}

	return divisionsById;
}

export async function initializeDuckDB(): Promise<DuckDBConnection> {
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

	return connection;
}

function buildQuery(baseUrl: string, divisionIds: Set<string>, boundingBox?: GeometryBoundingBox) {
	const bboxVariablesSql = boundingBox
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
			division_id,
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

	conditions.push(`class = 'land'`);

	// Older content stores division_area IDs and the Overture Explorer now gives division IDs, so either matches
	const quotedIds = [...divisionIds].map((id) => `'${id}'`).join(', ');
	conditions.push(`(id IN (${quotedIds}) OR division_id IN (${quotedIds}))`);

	query += `
		WHERE ${conditions.join('\n\t\t\tAND ')}`;

	return bboxVariablesSql + query + ';';
}

async function cacheDivisionGeometry(id: string, geometry: DivisionGeometry, cachePath: string) {
	try {
		await saveDivisionDataCache(id, geometry, cachePath);
	} catch (error) {
		log.warn(`Failed to cache ${id}: ${formatError(error)}`);
	}
}

function parseDivisionGeometry(row: DivisionRow, id: string): DivisionGeometry | undefined {
	try {
		const geometry = JSON.parse(row.geometryGeojson) as Geometry;

		if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') return geometry;

		return;
	} catch (error) {
		log.warn(`Failed to parse geometry for ${id}: ${formatError(error)}`);

		return;
	}
}

async function readCachedDivisions(divisionIds: Set<string>, cachePath: string) {
	const cached = new Map<string, DivisionItem>();
	const uncachedIds = new Set<string>();

	for (const divisionId of divisionIds) {
		const item = await getDivisionDataCache(divisionId, cachePath);

		if (item) {
			cached.set(divisionId, item);
		} else {
			uncachedIds.add(divisionId);
		}
	}

	return { cached, uncachedIds };
}

async function runDivisionQuery(db: DuckDBConnection, query: string): Promise<Array<DivisionRow>> {
	const result = await db.run(query);
	const rows: Array<DivisionRow> = [];

	for (let index = 0; index < result.chunkCount; index++) {
		for (const row of result.getChunk(index).getRows()) {
			rows.push({
				areaId: row[0] as string,
				geometryGeojson: row[2] as string,
				parentDivisionId: row[1] as string,
			});
		}
	}

	return rows;
}
