import type { Position } from 'geojson';

import { center as turfCenter } from '@turf/center';
import { distance } from '@turf/distance';
import { degreesToRadians, lengthToDegrees } from '@turf/helpers';
import { truncate } from '@turf/truncate';
import { geoBounds } from 'd3-geo';

import type { MapFeatureCollection } from '#lib/map/map-types.ts';

import { getTruncatedLngLat } from '#lib/map/map-utils.ts';

export interface MapDataBoundsProps {
	boundsBuffer?: number | undefined;
	boundsBufferPercentage?: number | undefined;
	featureCollection: MapFeatureCollection | undefined;
	limitsBuffer?: number | undefined;
	limitsBufferPercentage?: number | undefined;
	limitsFeatureCollection?: MapFeatureCollection | undefined; // Optional: used by individual location maps
	targetId?: string | undefined; // Optional: use for centering on a specific point
}

const mapBoundsBufferMin = 1;
const mapLimitsBufferMin = 10;

interface BboxBufferOptions {
	bufferPercentage: number;
	explicitBuffer: number | undefined;
	minBuffer: number;
}

// Calculate map bounds based on geodata and some parameters
// This should not include outliers; bounds/center frame featureCollection
// maxBounds spans limitsFeatureCollection (the rendered set)
// By default there is a 10% buffer on the frame and the pan limit is 100% of the max span
// But these values can be overridden on a case-by-case basis
export function getMapBounds({
	featureCollection: featureCollectionRaw,
	limitsFeatureCollection: limitsFeatureCollectionRaw,
	boundsBuffer,
	boundsBufferPercentage = 10,
	limitsBuffer,
	limitsBufferPercentage = 100,
	targetId,
}: MapDataBoundsProps):
	| undefined
	| {
			bounds: [number, number, number, number];
			center: [number, number];
			maxBounds: [number, number, number, number];
	  } {
	if (!featureCollectionRaw) return;

	const featureCollection = filterMapOutliers(featureCollectionRaw);

	if (featureCollection.features.length === 0) return;

	const limitsFeatureCollection = limitsFeatureCollectionRaw
		? filterMapOutliers(limitsFeatureCollectionRaw)
		: featureCollection;

	const bounds = getBufferedBbox(featureCollection, {
		explicitBuffer: boundsBuffer,
		bufferPercentage: boundsBufferPercentage,
		minBuffer: mapBoundsBufferMin,
	});
	const maxBounds = getBufferedBbox(limitsFeatureCollection, {
		explicitBuffer: limitsBuffer,
		bufferPercentage: limitsBufferPercentage,
		minBuffer: mapLimitsBufferMin,
	});

	if (!bounds || !maxBounds) return;

	return {
		center: getMapCenter(featureCollection, targetId),
		bounds,
		maxBounds,
	};
}

function filterMapOutliers(featureCollection: MapFeatureCollection): MapFeatureCollection {
	return {
		...featureCollection,
		features: featureCollection.features.filter((item) => item.properties.outlier !== true),
	} satisfies MapFeatureCollection;
}

function getBufferedBbox(
	featureCollection: MapFeatureCollection,
	{ explicitBuffer, bufferPercentage, minBuffer }: BboxBufferOptions,
): [number, number, number, number] | undefined {
	if (featureCollection.features.length === 0) return undefined;

	const naturalBounds = getNaturalBounds(featureCollection);

	let bufferRadius = explicitBuffer;

	if (bufferRadius === undefined) {
		if (featureCollection.features.length === 1) {
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

	// Longitude degrees shrink by cos(lat), so widen the pad at the bbox mid-latitude
	const latPad = lengthToDegrees(bufferRadius);
	const lngPad = latPad / Math.cos(degreesToRadians((naturalBounds[1] + naturalBounds[3]) / 2));

	const west = naturalBounds[0] - lngPad;
	const south = Math.max(naturalBounds[1] - latPad, -85);
	const east = naturalBounds[2] + lngPad;
	const north = Math.min(naturalBounds[3] + latPad, 85);

	// MapLibre wraps each pan limit into one world, so a wider range would fold onto itself
	if (east - west >= 360) return [-180, south, 180, north];

	return [west, south, east, north];
}

function getMapCenter(
	featureCollection: MapFeatureCollection,
	targetId: string | undefined,
): [number, number] {
	const targetFeature = targetId
		? featureCollection.features.find(({ id }) => id === targetId)
		: undefined;

	if (targetFeature) {
		const center = truncate(turfCenter(targetFeature.geometry));

		return getTruncatedLngLat(center.geometry.coordinates);
	}

	const [west, south, east, north] = getNaturalBounds(featureCollection);
	const longitude = (((west + east) / 2 + 180) % 360) - 180;

	return getTruncatedLngLat([longitude, (south + north) / 2]);
}

// Vertices only: d3 reads GeoJSON polygon winding as inverted and bulges edges along great circles
// East passes 180 when the shortest span crosses the antimeridian; MapLibre accepts this form
function getNaturalBounds(
	featureCollection: MapFeatureCollection,
): [number, number, number, number] {
	const [[west, south], [east, north]] = geoBounds({
		type: 'MultiPoint',
		coordinates: getVertices(featureCollection),
	});

	return [west, south, west > east ? east + 360 : east, north];
}

function getVertices(featureCollection: MapFeatureCollection): Array<Position> {
	return featureCollection.features.flatMap(({ geometry }) => {
		if (geometry.type === 'Point') return [geometry.coordinates];
		if (geometry.type === 'LineString') return geometry.coordinates;
		return geometry.coordinates.flat();
	});
}
