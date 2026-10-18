import type { MapSourceItem } from '@spectralcodex/map-codec';

import { distance } from '@turf/distance';
import { degreesToRadians, lengthToDegrees } from '@turf/helpers';
import { geoBounds } from 'd3-geo';

import { getTruncatedLngLat } from '#lib/map/map-utils.ts';

export interface MapBoundsOptions {
	boundsBuffer?: number | undefined;
	boundsBufferPercentage?: number | undefined;
	limitsBuffer?: number | undefined;
	limitsBufferPercentage?: number | undefined;
}

interface MapBoundsInput extends MapBoundsOptions {
	limitRows?: ReadonlyArray<MapSourceItem> | undefined;
	targetRows?: ReadonlyArray<MapSourceItem> | undefined;
}

type MapBbox = [number, number, number, number];

const mapBoundsBufferMin = 1;
const mapLimitsBufferMin = 10;

const inlierBoundsCache = new WeakMap<ReadonlyArray<MapSourceItem>, MapBbox | undefined>();

interface BboxBufferOptions {
	bufferPercentage: number;
	explicitBuffer: number | undefined;
	minBuffer: number;
}

export function getMapBounds(
	rows: ReadonlyArray<MapSourceItem>,
	{
		boundsBuffer,
		boundsBufferPercentage = 10,
		limitRows = rows,
		limitsBuffer,
		limitsBufferPercentage = 100,
		targetRows = [],
	}: MapBoundsInput = {},
): undefined | { bounds: MapBbox; center: [number, number]; maxBounds: MapBbox } {
	const frameRows = getFrameRows(rows, targetRows);
	const limitNaturalBounds = getLimitNaturalBounds(limitRows, targetRows);

	if (!limitNaturalBounds || frameRows.length === 0) return;

	const frameNaturalBounds = getNaturalBounds(frameRows);
	const bounds = getBufferedBbox(frameNaturalBounds, {
		bufferPercentage: boundsBufferPercentage,
		explicitBuffer: boundsBuffer,
		minBuffer: mapBoundsBufferMin,
	});
	const maxBounds = getBufferedBbox(limitNaturalBounds, {
		bufferPercentage: limitsBufferPercentage,
		explicitBuffer: limitsBuffer,
		minBuffer: mapLimitsBufferMin,
	});

	return { bounds, center: getBboxCenter(frameNaturalBounds), maxBounds };
}

function getFrameRows(
	rows: ReadonlyArray<MapSourceItem>,
	targetRows: ReadonlyArray<MapSourceItem>,
) {
	if (targetRows.length > 0) return targetRows;

	return rows.filter(({ properties }) => properties.outlier !== true);
}

function getLimitNaturalBounds(
	limitRows: ReadonlyArray<MapSourceItem>,
	targetRows: ReadonlyArray<MapSourceItem>,
): MapBbox | undefined {
	const inlierBounds = getInlierNaturalBounds(limitRows);

	if (targetRows.length === 0) return inlierBounds;

	const targetBounds = getNaturalBounds(targetRows);

	if (!inlierBounds) return targetBounds;

	return [
		Math.min(inlierBounds[0], targetBounds[0]),
		Math.min(inlierBounds[1], targetBounds[1]),
		Math.max(inlierBounds[2], targetBounds[2]),
		Math.max(inlierBounds[3], targetBounds[3]),
	];
}

function getInlierNaturalBounds(rows: ReadonlyArray<MapSourceItem>) {
	if (inlierBoundsCache.has(rows)) return inlierBoundsCache.get(rows);

	const inlierRows = rows.filter(({ properties }) => properties.outlier !== true);
	const inlierBounds = inlierRows.length > 0 ? getNaturalBounds(inlierRows) : undefined;

	inlierBoundsCache.set(rows, inlierBounds);

	return inlierBounds;
}

function getBufferedBbox(
	naturalBounds: MapBbox,
	{ bufferPercentage, explicitBuffer, minBuffer }: BboxBufferOptions,
): MapBbox {
	const spanX = distance(
		[naturalBounds[0], naturalBounds[1]],
		[naturalBounds[2], naturalBounds[1]],
	);
	const spanY = distance(
		[naturalBounds[0], naturalBounds[1]],
		[naturalBounds[0], naturalBounds[3]],
	);
	const bufferRadius =
		explicitBuffer ?? Math.max(minBuffer, Math.max(spanX, spanY) * (bufferPercentage / 100));

	const latPad = lengthToDegrees(bufferRadius);
	const lngPad = latPad / Math.cos(degreesToRadians((naturalBounds[1] + naturalBounds[3]) / 2));

	const west = naturalBounds[0] - lngPad;
	const south = Math.max(naturalBounds[1] - latPad, -85);
	const east = naturalBounds[2] + lngPad;
	const north = Math.min(naturalBounds[3] + latPad, 85);

	// MapLibre wraps a pan limit into a single world, so a wider range would fold onto itself
	if (east - west >= 360) return [-180, south, 180, north];

	return [west, south, east, north];
}

function getBboxCenter([west, south, east, north]: MapBbox): [number, number] {
	const longitude = (((west + east) / 2 + 180) % 360) - 180;

	return getTruncatedLngLat([longitude, (south + north) / 2]);
}

// East goes past 180 when the shortest span crosses the antimeridian, which MapLibre accepts
function getNaturalBounds(rows: ReadonlyArray<MapSourceItem>): MapBbox {
	const [[west, south], [east, north]] = geoBounds({
		coordinates: rows.map(({ geometry }) => geometry.coordinates),
		type: 'MultiPoint',
	});

	return [west, south, west > east ? east + 360 : east, north];
}
