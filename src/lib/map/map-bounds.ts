import type { MapSourceItem } from '@spectralcodex/map-codec';

import { getMapRowById } from '@spectralcodex/map-codec';
import { distance } from '@turf/distance';
import { degreesToRadians, lengthToDegrees } from '@turf/helpers';
import { geoBounds } from 'd3-geo';

import { mapPointIdSeparator } from '#constants.ts';
import { getTruncatedLngLat } from '#lib/map/map-utils.ts';

export interface MapBoundsOptions {
	boundsBuffer?: number | undefined;
	boundsBufferPercentage?: number | undefined;
	limitsBuffer?: number | undefined;
	limitsBufferPercentage?: number | undefined;
	targetId?: string | undefined;
}

const mapBoundsBufferMin = 1;
const mapLimitsBufferMin = 10;

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
		limitsBuffer,
		limitsBufferPercentage = 100,
		targetId,
	}: MapBoundsOptions = {},
):
	| undefined
	| {
			bounds: [number, number, number, number];
			center: [number, number];
			maxBounds: [number, number, number, number];
	  } {
	const shownRows = rows.filter(
		({ properties }) => properties.outlier !== true || isTargetFeature(properties.id, targetId),
	);
	const targetRows = shownRows.filter(({ properties }) => isTargetFeature(properties.id, targetId));
	const frameRows = targetRows.length > 0 ? targetRows : shownRows;

	const bounds = getBufferedBbox(frameRows, {
		bufferPercentage: boundsBufferPercentage,
		explicitBuffer: boundsBuffer,
		minBuffer: mapBoundsBufferMin,
	});
	const maxBounds = getBufferedBbox(shownRows, {
		bufferPercentage: limitsBufferPercentage,
		explicitBuffer: limitsBuffer,
		minBuffer: mapLimitsBufferMin,
	});

	if (!bounds || !maxBounds) return;

	return { bounds, center: getMapCenter(frameRows, targetId), maxBounds };
}

export function isTargetFeature(id: number | string | undefined, targetId: string | undefined) {
	if (!targetId) return false;

	return id === targetId || String(id).startsWith(`${targetId}${mapPointIdSeparator}`);
}

function getBufferedBbox(
	rows: ReadonlyArray<MapSourceItem>,
	{ bufferPercentage, explicitBuffer, minBuffer }: BboxBufferOptions,
): [number, number, number, number] | undefined {
	if (rows.length === 0) return undefined;

	const naturalBounds = getNaturalBounds(rows);

	let bufferRadius = explicitBuffer;

	if (bufferRadius === undefined) {
		if (rows.length === 1) {
			bufferRadius = minBuffer;
		} else {
			const spanX = distance(
				[naturalBounds[0], naturalBounds[1]],
				[naturalBounds[2], naturalBounds[1]],
			);
			const spanY = distance(
				[naturalBounds[0], naturalBounds[1]],
				[naturalBounds[0], naturalBounds[3]],
			);
			const spanMax = Math.max(spanX, spanY);
			bufferRadius = Math.max(minBuffer, spanMax * (bufferPercentage / 100));
		}
	}

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

function getMapCenter(
	rows: ReadonlyArray<MapSourceItem>,
	targetId: string | undefined,
): [number, number] {
	const targetRow = targetId ? getMapRowById(rows, targetId) : undefined;

	if (targetRow) return getTruncatedLngLat(targetRow.geometry.coordinates);

	const [west, south, east, north] = getNaturalBounds(rows);
	const longitude = (((west + east) / 2 + 180) % 360) - 180;

	return getTruncatedLngLat([longitude, (south + north) / 2]);
}

// East goes past 180 when the shortest span crosses the antimeridian, which MapLibre accepts
function getNaturalBounds(rows: ReadonlyArray<MapSourceItem>): [number, number, number, number] {
	const [[west, south], [east, north]] = geoBounds({
		coordinates: rows.map(({ geometry }) => geometry.coordinates),
		type: 'MultiPoint',
	});

	return [west, south, west > east ? east + 360 : east, north];
}
