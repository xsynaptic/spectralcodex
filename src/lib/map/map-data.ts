import type { MapComponentProps } from '@spectralcodex/react-map-component';
import type { BBox } from 'geojson';

import { bbox, buffer, distance, truncate, center as turfCenter } from '@turf/turf';
import { MAP_PROTOMAPS_API_KEY } from 'astro:env/client';

import type { MapComponentData, MapFeatureCollection } from '#lib/map/map-types.ts';

import {
	getLocationsMapApiHashes,
	getLocationsMapPopupData,
	getLocationsMapSourceData,
} from '#lib/map/map-locations.ts';
import { isLngLatBoundsLike } from '#lib/map/map-type-guards.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';
import { getTruncatedLngLat } from '#lib/map/map-utils.ts';

interface MapDataBoundsProps {
	featureCollection: MapFeatureCollection | undefined;
	boundsBuffer?: number | undefined;
	boundsBufferPercentage?: number | undefined;
	limitsBuffer?: number | undefined;
	limitsBufferPercentage?: number | undefined;
	targetId?: string | undefined; // Optional: use for centering on a specific point
}

const buildProps = {
	protomapsApiKey: MAP_PROTOMAPS_API_KEY,
	isDev: import.meta.env.DEV,
};

const BOUNDS_BUFFER_MIN = 0.1;
const LIMITS_BUFFER_MIN = 10;

// Calculate map bounds based on geodata and some parameters; should not include outliers
// By default there is a 10% buffer added to the bounding box
// The overall limit of the map is set to 100% of the maximum span
// But these values can be overridden on a case-by-case basis
function getMapBounds({
	featureCollection: featureCollectionRaw,
	boundsBuffer,
	boundsBufferPercentage = 10,
	limitsBuffer,
	limitsBufferPercentage = 100,
	targetId,
}: MapDataBoundsProps) {
	if (!featureCollectionRaw) return;

	// Filter the feature collection for outliers
	// This can be set in frontmatter to avoid skewing calculations
	const featureCollection = {
		...featureCollectionRaw,
		features: featureCollectionRaw.features.filter((item) => item.properties.outlier !== true),
	} satisfies MapFeatureCollection;

	if (featureCollection.features.length === 0) return;

	const targetFeature = targetId
		? featureCollection.features.find(({ id }) => id === targetId)
		: undefined;

	const center = truncate(turfCenter(targetFeature ? targetFeature.geometry : featureCollection));

	let bounds: BBox | undefined;
	let maxBounds: BBox | undefined;
	let boundsBufferCollection: ReturnType<typeof buffer> | undefined;
	let maxBoundsBufferCollection: ReturnType<typeof buffer> | undefined;

	if (boundsBuffer && limitsBuffer) {
		boundsBufferCollection = buffer(featureCollection, boundsBuffer);
		maxBoundsBufferCollection = buffer(featureCollection, limitsBuffer);
	} else {
		// Note: single points will have a fixed buffer
		if (featureCollection.features.length === 1) {
			boundsBufferCollection = buffer(
				featureCollection,
				Math.max(BOUNDS_BUFFER_MIN, BOUNDS_BUFFER_MIN * (boundsBufferPercentage / 100)),
			);
			maxBoundsBufferCollection = buffer(
				featureCollection,
				Math.max(LIMITS_BUFFER_MIN, LIMITS_BUFFER_MIN * (limitsBufferPercentage / 100)),
			);
		} else {
			const naturalBounds = bbox(featureCollection);
			const spanX = distance(
				[naturalBounds[0], naturalBounds[1]],
				[naturalBounds[2], naturalBounds[1]],
			);
			const spanY = distance(
				[naturalBounds[0], naturalBounds[1]],
				[naturalBounds[0], naturalBounds[3]],
			);
			const spanMax = Math.max(spanX, spanY);

			boundsBufferCollection = buffer(
				featureCollection,
				Math.max(BOUNDS_BUFFER_MIN, spanMax * (boundsBufferPercentage / 100)),
			);
			maxBoundsBufferCollection = buffer(
				featureCollection,
				Math.max(LIMITS_BUFFER_MIN, spanMax * (limitsBufferPercentage / 100)),
			);
		}
	}

	if (boundsBufferCollection && maxBoundsBufferCollection) {
		bounds = bbox(boundsBufferCollection);
		maxBounds = bbox(maxBoundsBufferCollection);
	}

	if (bounds && maxBounds && isLngLatBoundsLike(bounds) && isLngLatBoundsLike(maxBounds)) {
		return {
			center: getTruncatedLngLat(center.geometry.coordinates),
			bounds,
			maxBounds,
		};
	}
	return;
}

// Prepare most of the necessary props and data for the map component
export function getMapData({
	featureCollection,
	targetId,
	boundsBuffer,
	boundsBufferPercentage,
	limitsBuffer,
	limitsBufferPercentage,
	mapApiBaseUrl,
	...restProps
}: MapDataBoundsProps &
	Omit<
		MapComponentProps,
		'bounds' | 'maxBounds' | 'center' | 'apiSourceUrl' | 'apiPopupUrl' | 'protomapsApiKey'
	> & {
		mapApiBaseUrl?: string | undefined;
	}) {
	const mapBounds = getMapBounds({
		featureCollection,
		boundsBuffer,
		boundsBufferPercentage,
		limitsBuffer,
		limitsBufferPercentage,
		targetId,
	});

	if (featureCollection && mapBounds) {
		if (mapApiBaseUrl) {
			const { sourceHash, popupHash } = getLocationsMapApiHashes(featureCollection);
			const apiSourceUrl = `${mapApiBaseUrl}/${MapApiDataEnum.Source}?v=${sourceHash}`;
			const apiPopupUrl = `${mapApiBaseUrl}/${MapApiDataEnum.Popup}?v=${popupHash}`;

			return {
				hasGeodata: true,
				apiSourceUrl,
				apiPopupUrl,
				prefetchUrls: [apiSourceUrl, apiPopupUrl],
				featureCount: featureCollection.features.length,
				...mapBounds,
				...buildProps,
				...restProps,
			} satisfies MapComponentData;
		} else {
			const sourceData = getLocationsMapSourceData(featureCollection);
			const popupData = getLocationsMapPopupData(featureCollection);

			return {
				hasGeodata: true,
				apiSourceUrl: undefined,
				apiPopupUrl: undefined,
				sourceData,
				popupData,
				featureCount: featureCollection.features.length,
				...mapBounds,
				...buildProps,
				...restProps,
			} satisfies MapComponentData;
		}
	}

	return {
		hasGeodata: false,
		apiSourceUrl: undefined,
		apiPopupUrl: undefined,
		sourceData: undefined,
		popupData: undefined,
		featureCount: 0,
		...buildProps,
		...restProps,
	} satisfies MapComponentData;
}
