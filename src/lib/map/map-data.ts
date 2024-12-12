import { bbox, buffer, center as getCenter, truncate } from '@turf/turf';

import type {
	MapComponentData,
	MapComponentProps,
	MapFeatureCollection,
} from '@/lib/map/map-types';

import { getLocationsMapPopupData, getLocationsMapSourceData } from '@/lib/map/map-locations';
import { isLngLatBoundsLike } from '@/lib/map/map-type-guards';
import { getTruncatedLngLat } from '@/lib/map/map-utils';

interface MapDataBoundsArgs {
	boundsBuffer?: number | undefined;
	boundsBufferMax?: number | undefined;
	featureCollection: MapFeatureCollection | undefined;
	targetId?: string | undefined; // Optional: use for centering on a specific point
}

const buildId = import.meta.env.BUILD_ID;

// Calculate map bounds based on geodata and some parameters; should not include outliers
const getMapBounds = ({
	featureCollection,
	targetId,
	boundsBuffer,
	boundsBufferMax,
}: MapDataBoundsArgs) => {
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
};

// Prepare most of the necessary props and data for the map component
export const getMapData = ({
	featureCollection,
	targetId,
	boundsBuffer = 5,
	boundsBufferMax = 300,
	apiEndpointUrl,
	...restProps
}: MapDataBoundsArgs & Omit<MapComponentProps, 'bounds' | 'maxBounds' | 'center'>) => {
	const mapBounds = getMapBounds({ featureCollection, targetId, boundsBuffer, boundsBufferMax });

	if (featureCollection && mapBounds) {
		if (apiEndpointUrl) {
			return {
				hasGeodata: true,
				apiEndpointUrl,
				prefetchUrls: [`${apiEndpointUrl}/1`, `${apiEndpointUrl}/2`], // Note the two part API
				featureCount: featureCollection.features.length,
				buildId,
				...mapBounds,
				...restProps,
			};
		} else {
			const sourceData = getLocationsMapSourceData(featureCollection);
			const popupData = getLocationsMapPopupData(featureCollection);

			return {
				hasGeodata: true,
				apiEndpointUrl: undefined,
				sourceData,
				popupData,
				featureCount: featureCollection.features.length,
				buildId,
				...mapBounds,
				...restProps,
			} satisfies MapComponentData;
		}
	}
	return {
		hasGeodata: false,
		apiEndpointUrl: undefined,
		sourceData: undefined,
		popupData: undefined,
		featureCount: 0,
		buildId,
		...restProps,
	} satisfies MapComponentData;
};
