import { bbox, buffer, center as getCenter, truncate } from '@turf/turf';
import { MAP_PROTOMAPS_API_KEY } from 'astro:env/client';

import type {
	MapComponentData,
	MapComponentProps,
	MapFeatureCollection,
} from '@/lib/map/map-types';

import { MAP_API_POPUP_ID, MAP_API_SOURCE_ID } from '@/constants';
import { getLocationsMapPopupData, getLocationsMapSourceData } from '@/lib/map/map-locations';
import { isLngLatBoundsLike } from '@/lib/map/map-type-guards';
import { getTruncatedLngLat } from '@/lib/map/map-utils';

interface MapDataBoundsProps {
	boundsBuffer?: number | undefined;
	boundsBufferMax?: number | undefined;
	featureCollection: MapFeatureCollection | undefined;
	targetId?: string | undefined; // Optional: use for centering on a specific point
}

interface MapDataProps extends MapDataBoundsProps {
	mapApiBaseUrl?: string | undefined;
}

const buildProps = {
	protomapsApiKey: MAP_PROTOMAPS_API_KEY,
	buildId: import.meta.env.BUILD_ID,
	isDev: import.meta.env.DEV,
};

// Calculate map bounds based on geodata and some parameters; should not include outliers
function getMapBounds({
	featureCollection,
	targetId,
	boundsBuffer,
	boundsBufferMax,
}: MapDataBoundsProps) {
	if (!featureCollection) return;

	const featureCollectionFiltered = {
		...featureCollection,
		features: featureCollection.features.filter((item) => item.properties.outlier !== true),
	} satisfies MapFeatureCollection;

	if (featureCollectionFiltered.features.length === 0) return;

	const targetFeature = targetId
		? featureCollection.features.find(({ id }) => id === targetId)
		: undefined;

	const center = truncate(
		getCenter(targetFeature ? targetFeature.geometry : featureCollectionFiltered),
	);

	const boundsBufferCollection = buffer(featureCollectionFiltered, boundsBuffer, {
		units: 'kilometers',
	});
	const boundsBufferMaxCollection = buffer(featureCollectionFiltered, boundsBufferMax, {
		units: 'kilometers',
	});

	if (boundsBufferCollection && boundsBufferMaxCollection) {
		const bounds = bbox(boundsBufferCollection);
		const maxBounds = bbox(boundsBufferMaxCollection);

		if (isLngLatBoundsLike(bounds) && isLngLatBoundsLike(maxBounds)) {
			return {
				center: getTruncatedLngLat(center.geometry.coordinates),
				bounds,
				maxBounds,
			};
		}
	}
	return;
}

// Prepare most of the necessary props and data for the map component
export function getMapData({
	featureCollection,
	targetId,
	boundsBuffer = 5,
	boundsBufferMax = 300,
	mapApiBaseUrl,
	...restProps
}: MapDataProps &
	Omit<
		MapComponentProps,
		'bounds' | 'maxBounds' | 'center' | 'apiSourceUrl' | 'apiPopupUrl' | 'protomapsApiKey'
	>) {
	const mapBounds = getMapBounds({ featureCollection, targetId, boundsBuffer, boundsBufferMax });

	if (featureCollection && mapBounds) {
		if (mapApiBaseUrl) {
			const apiSourceUrl = `${mapApiBaseUrl}/${MAP_API_SOURCE_ID}`;
			const apiPopupUrl = `${mapApiBaseUrl}/${MAP_API_POPUP_ID}`;

			return {
				hasGeodata: true,
				apiSourceUrl,
				apiPopupUrl,
				prefetchUrls: [apiSourceUrl, apiPopupUrl],
				featureCount: featureCollection.features.length,
				...mapBounds,
				...buildProps,
				...restProps,
			};
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
