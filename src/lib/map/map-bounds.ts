import type { BBox } from 'geojson';
import type { LngLatBoundsLike } from 'maplibre-gl';

import { bbox } from '@turf/bbox';
import { center as turfCenter } from '@turf/center';
import { distance } from '@turf/distance';
import { degreesToRadians, lengthToDegrees } from '@turf/helpers';
import { truncate } from '@turf/truncate';

import type { MapFeatureCollection } from '#lib/map/map-types.ts';

import { getTruncatedLngLat } from '#lib/map/map-utils.ts';

export interface MapDataBoundsProps {
	featureCollection: MapFeatureCollection | undefined;
	limitsFeatureCollection?: MapFeatureCollection | undefined; // Optional: used by individual location maps
	boundsBuffer?: number | undefined;
	boundsBufferPercentage?: number | undefined;
	limitsBuffer?: number | undefined;
	limitsBufferPercentage?: number | undefined;
	targetId?: string | undefined; // Optional: use for centering on a specific point
}

const mapBoundsBufferMin = 1;
const mapLimitsBufferMin = 10;

// GeoJSON bounding boxes can have 6 items in the array; MapLibre only supports 4
function isLngLatBoundsLike(input: unknown): input is LngLatBoundsLike {
	return (
		!!input &&
		Array.isArray(input) &&
		input.length === 4 &&
		input.every((item) => typeof item === 'number')
	);
}

function filterMapOutliers(featureCollection: MapFeatureCollection): MapFeatureCollection {
	return {
		...featureCollection,
		features: featureCollection.features.filter((item) => item.properties.outlier !== true),
	} satisfies MapFeatureCollection;
}

function getBufferedBbox(
	featureCollection: MapFeatureCollection,
	explicitBuffer: number | undefined,
	bufferPercentage: number,
	minBuffer: number,
): BBox | undefined {
	if (featureCollection.features.length === 0) return undefined;

	const naturalBounds = bbox(featureCollection);

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

	return [
		naturalBounds[0] - lngPad,
		Math.max(naturalBounds[1] - latPad, -85),
		naturalBounds[2] + lngPad,
		Math.min(naturalBounds[3] + latPad, 85),
	];
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
	| {
			center: [number, number];
			bounds: [number, number, number, number];
			maxBounds: [number, number, number, number];
	  }
	| undefined {
	if (!featureCollectionRaw) return;

	const featureCollection = filterMapOutliers(featureCollectionRaw);

	if (featureCollection.features.length === 0) return;

	const limitsFeatureCollection = limitsFeatureCollectionRaw
		? filterMapOutliers(limitsFeatureCollectionRaw)
		: featureCollection;

	const targetFeature = targetId
		? featureCollection.features.find(({ id }) => id === targetId)
		: undefined;

	const center = truncate(turfCenter(targetFeature ? targetFeature.geometry : featureCollection));

	const bounds = getBufferedBbox(
		featureCollection,
		boundsBuffer,
		boundsBufferPercentage,
		mapBoundsBufferMin,
	);
	const maxBounds = getBufferedBbox(
		limitsFeatureCollection,
		limitsBuffer,
		limitsBufferPercentage,
		mapLimitsBufferMin,
	);

	if (bounds && maxBounds && isLngLatBoundsLike(bounds) && isLngLatBoundsLike(maxBounds)) {
		return {
			center: getTruncatedLngLat(center.geometry.coordinates),
			bounds,
			maxBounds,
		};
	}
	return;
}
