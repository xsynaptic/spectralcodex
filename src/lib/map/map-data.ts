import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { MapComponentProps, MapFeaturesRule } from '@spectralcodex/react-map-component';

import { encodeMapPopupData, encodeMapSourceData } from '@spectralcodex/map-codec';
import { MAP_PROTOMAPS_API_KEY } from 'astro:env/client';
import { IMAGE_SERVER_URL } from 'astro:env/server';

import type { MapDataBoundsProps } from '#lib/map/map-bounds.ts';
import type { MapComponentData, MapFeatureCollection } from '#lib/map/map-types.ts';

import { mapSourceInlineLimit } from '#constants.ts';
import { getMapBounds, isTargetFeature } from '#lib/map/map-bounds.ts';
import {
	getLocationsMapPopupData,
	getLocationsMapSourceData,
	hashMapPopupData,
	hashMapSourceData,
} from '#lib/map/map-locations.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';
import { getBasePath } from '#lib/utils/routing.ts';

// Region and theme maps pass a membership hint; other big maps fall back to an id list
type MapFeaturesRuleHint =
	{ index: number; type: 'theme' } | { interval: [number, number]; type: 'region' };

// Stamp each inline source row with its shared popup-chunk key so hover/click can fetch the chunk
function getInlineSourceData(
	sourceData: Array<MapSourceItem> | undefined,
	chunkKeyById: Map<string, string> | undefined,
): Array<MapSourceItem> | undefined {
	if (!sourceData || !chunkKeyById) return sourceData;

	return sourceData.map((item) => {
		const chunkKey = chunkKeyById.get(item.properties.id);
		return chunkKey ? { ...item, properties: { ...item.properties, chunkKey } } : item;
	});
}

const defaultMapComponentProps = {
	apiPopupUrl: undefined,
	apiSourceUrl: undefined,
	imageServerUrl: IMAGE_SERVER_URL,
	isDev: import.meta.env.DEV,
	popupData: undefined,
	protomapsApiKey: MAP_PROTOMAPS_API_KEY,
	sourceData: undefined,
} satisfies MapComponentProps;

// Prepare most of the necessary props and data for the map component
export function getMapData({
	boundsBuffer,
	boundsBufferPercentage,
	boundsFeatureCollection,
	chunkKeyById,
	featureCollection,
	limitsBuffer,
	limitsBufferPercentage,
	locationCount,
	mapFeaturesRule,
	mapId,
	targetId,
	version,
	...props
}: MapDataBoundsProps &
	Omit<
		MapComponentProps,
		| 'apiChunkBaseUrl'
		| 'apiPopupUrl'
		| 'apiSourceUrl'
		| 'bounds'
		| 'center'
		| 'mapFeaturesRule'
		| 'maxBounds'
		| 'popupData'
		| 'popupDataKey'
		| 'protomapsApiKey'
		| 'sourceData'
		| 'sourceDataKey'
		| 'version'
	> & {
		// Frame from a different set than the inlined data (e.g. center on the target while inlining its neighbors)
		boundsFeatureCollection?: MapFeatureCollection | undefined;
		chunkKeyById?: Map<string, string> | undefined;
		locationCount?: number | undefined;
		mapFeaturesRule?: MapFeaturesRuleHint | undefined;
		// Not optional, so a new call site cannot skip the cache version by accident
		version: string | undefined;
	}) {
	const mapBounds = getMapBounds({
		boundsBuffer,
		boundsBufferPercentage,
		featureCollection: boundsFeatureCollection ?? featureCollection,
		limitsBuffer,
		limitsBufferPercentage,
		limitsFeatureCollection: featureCollection,
		targetId,
	});

	if (!featureCollection || !mapBounds) {
		return {
			featureCount: 0,
			hasGeodata: false,
			props: { ...defaultMapComponentProps, ...props },
		} satisfies MapComponentData;
	}

	const featureCount = featureCollection.features.length;

	const baseProps = {
		...defaultMapComponentProps,
		...mapBounds,
		...props,
		targetIds: getTargetIds(featureCollection, targetId),
	};

	// MDX inline maps (no mapId): inline both source and popup, no chunks
	if (!mapId) {
		return {
			featureCount,
			hasGeodata: true,
			props: { ...baseProps, ...getInlineData(featureCollection) },
		} satisfies MapComponentData;
	}

	// All other maps: popups come from the shared, demand-fetched chunks
	const apiChunkBaseUrl = getBasePath('api/map/');

	// Small maps inline their points, each carrying its chunk key
	if ((locationCount ?? featureCount) <= mapSourceInlineLimit) {
		return {
			featureCount,
			hasGeodata: true,
			props: {
				...baseProps,
				mapId,
				...getChunkedInlineData(featureCollection, chunkKeyById),
				apiChunkBaseUrl,
				version,
			},
		} satisfies MapComponentData;
	}

	const { prefetchUrls, ...directoryProps } = getDirectoryData(
		featureCollection,
		mapFeaturesRule,
		version,
	);

	return {
		featureCount,
		hasGeodata: true,
		prefetchUrls,
		props: { ...baseProps, mapId, ...directoryProps, apiChunkBaseUrl, version },
	} satisfies MapComponentData;
}

// Dedicated per-map source/popup endpoints; objectives uses this to keep hidden points off the shared directory
export function getMapDataDedicated({
	featureCollection,
	mapId,
	...props
}: Pick<MapComponentProps, 'isObjectiveFilterEnabled'> & {
	featureCollection: MapFeatureCollection | undefined;
	mapId: string;
}): MapComponentData {
	const mapBounds = getMapBounds({ featureCollection });

	if (!featureCollection || !mapBounds) {
		return {
			featureCount: 0,
			hasGeodata: false,
			props: { ...defaultMapComponentProps, ...props },
		} satisfies MapComponentData;
	}

	const sourceHash = hashMapSourceData(getLocationsMapSourceData(featureCollection));
	const popupHash = hashMapPopupData(getLocationsMapPopupData(featureCollection));
	const apiSourceUrl = getBasePath(
		'api/map',
		mapId,
		`${MapApiDataEnum.Source}.json?v=${sourceHash}`,
	);
	const apiPopupUrl = getBasePath('api/map', mapId, `${MapApiDataEnum.Popup}.json?v=${popupHash}`);

	return {
		featureCount: featureCollection.features.length,
		hasGeodata: true,
		prefetchUrls: [apiSourceUrl, apiPopupUrl],
		props: {
			...defaultMapComponentProps,
			apiPopupUrl,
			apiSourceUrl,
			mapId,
			...mapBounds,
			...props,
		},
	} satisfies MapComponentData;
}

function getChunkedInlineData(
	featureCollection: MapFeatureCollection,
	chunkKeyById: Map<string, string> | undefined,
) {
	// Hash the un-stamped rows so inline keys match the equivalent API payload
	const sourceData = getLocationsMapSourceData(featureCollection);
	const inlineSourceData = getInlineSourceData(sourceData, chunkKeyById);

	return {
		sourceData: inlineSourceData ? encodeMapSourceData(inlineSourceData) : undefined,
		sourceDataKey: hashMapSourceData(sourceData),
	};
}

function getDirectoryData(
	featureCollection: MapFeatureCollection,
	mapFeaturesRule: MapFeaturesRuleHint | undefined,
	version: string | undefined,
) {
	const apiSourceUrl = getBasePath('api/map', `map-directory.json?v=${version ?? 'unknown'}`);

	// No membership hint resolves to this map's explicit, order-preserving id list
	const resolvedRule: MapFeaturesRule = mapFeaturesRule ?? {
		ids: featureCollection.features.map((feature) => String(feature.id)),
		type: 'ids',
	};

	return { apiSourceUrl, mapFeaturesRule: resolvedRule, prefetchUrls: [apiSourceUrl] };
}

function getInlineData(featureCollection: MapFeatureCollection) {
	const sourceData = getLocationsMapSourceData(featureCollection);
	const popupData = getLocationsMapPopupData(featureCollection);

	return {
		popupData: popupData ? encodeMapPopupData(popupData) : undefined,
		popupDataKey: hashMapPopupData(popupData),
		sourceData: sourceData ? encodeMapSourceData(sourceData) : undefined,
		sourceDataKey: hashMapSourceData(sourceData),
	};
}

function getTargetIds(featureCollection: MapFeatureCollection, targetId: string | undefined) {
	if (!targetId) return;

	return featureCollection.features
		.filter(({ id }) => isTargetFeature(id, targetId))
		.map(({ id }) => String(id));
}
