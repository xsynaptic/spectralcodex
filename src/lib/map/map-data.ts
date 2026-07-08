import type {
	MapComponentData,
	MapComponentProps,
	MapScope,
	MapSourceItemInput,
} from '@spectralcodex/react-map-component';

import { MapDataKeysCompressed } from '@spectralcodex/shared/map';
import { MAP_PROTOMAPS_API_KEY } from 'astro:env/client';
import { IMAGE_SERVER_URL } from 'astro:env/server';

import type { MapDataBoundsProps } from '#lib/map/map-bounds.ts';
import type { MapFeatureCollection } from '#lib/map/map-types.ts';

import { MAP_SOURCE_INLINE_LIMIT } from '#constants.ts';
import { getMapBounds } from '#lib/map/map-bounds.ts';
import {
	getLocationsMapPopupData,
	getLocationsMapSourceData,
	hashMapPopupData,
	hashMapSourceData,
} from '#lib/map/map-locations.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';
import { getBaseUrl } from '#lib/utils/routing.ts';

// Region and theme maps pass a membership hint; other big maps fall back to an id list
type MapScopeHint =
	{ type: 'region'; interval: [number, number] } | { type: 'theme'; index: number };

// Stamp each inline source row with its shared popup-chunk key so hover/click can fetch the chunk
function getInlineSourceData(
	sourceData: Array<MapSourceItemInput> | undefined,
	chunkKeyById: Map<string, string> | undefined,
): Array<MapSourceItemInput> | undefined {
	if (!sourceData || !chunkKeyById) return sourceData;

	return sourceData.map((item) => {
		const chunkKey = chunkKeyById.get(item[MapDataKeysCompressed.Id]);
		return chunkKey ? { ...item, [MapDataKeysCompressed.ChunkKey]: chunkKey } : item;
	});
}

const defaultMapDataProps = {
	hasGeodata: false,
	apiSourceUrl: undefined,
	apiPopupUrl: undefined,
	sourceData: undefined,
	popupData: undefined,
	featureCount: 0,
	imageServerUrl: IMAGE_SERVER_URL,
	protomapsApiKey: MAP_PROTOMAPS_API_KEY,
	version: import.meta.env.BUILD_VERSION,
	isDev: import.meta.env.DEV,
} satisfies MapComponentData;

// Prepare most of the necessary props and data for the map component
export function getMapData({
	mapId,
	featureCollection,
	targetId,
	boundsBuffer,
	boundsBufferPercentage,
	limitsBuffer,
	limitsBufferPercentage,
	locationCount,
	scope,
	chunkKeyById,
	boundsFeatureCollection,
	...props
}: Omit<
	MapComponentProps,
	| 'bounds'
	| 'maxBounds'
	| 'center'
	| 'apiSourceUrl'
	| 'apiPopupUrl'
	| 'protomapsApiKey'
	| 'scope'
	| 'apiChunkBaseUrl'
	| 'sourceData'
	| 'popupData'
	| 'sourceDataKey'
	| 'popupDataKey'
	| 'version'
> &
	MapDataBoundsProps & {
		locationCount?: number | undefined;
		scope?: MapScopeHint | undefined;
		chunkKeyById?: Map<string, string> | undefined;
		// Frame from a different set than the inlined data (e.g. center on the target while inlining its neighbors)
		boundsFeatureCollection?: MapFeatureCollection | undefined;
	}) {
	const mapBounds = getMapBounds({
		featureCollection: boundsFeatureCollection ?? featureCollection,
		limitsFeatureCollection: featureCollection,
		boundsBuffer,
		boundsBufferPercentage,
		limitsBuffer,
		limitsBufferPercentage,
		targetId,
	});

	if (!featureCollection || !mapBounds) {
		return {
			...defaultMapDataProps,
			...props,
		} satisfies MapComponentData;
	}

	const targetIds = targetId
		? featureCollection.features
				.filter(({ id }) => id === targetId || String(id).startsWith(`${targetId}-`))
				.map(({ id }) => String(id))
		: undefined;

	const featureCount = featureCollection.features.length;

	// MDX inline maps (no mapId): inline both source and popup, no chunks
	if (!mapId) {
		const sourceData = getLocationsMapSourceData(featureCollection);
		const popupData = getLocationsMapPopupData(featureCollection);

		return {
			...defaultMapDataProps,
			hasGeodata: true,
			sourceData,
			popupData,
			sourceDataKey: hashMapSourceData(sourceData),
			popupDataKey: hashMapPopupData(popupData),
			featureCount,
			...mapBounds,
			...props,
			targetIds,
		} satisfies MapComponentData;
	}

	// All other maps: popups come from the shared, demand-fetched chunks
	const apiChunkBaseUrl = getBaseUrl('api/map/');
	const count = locationCount ?? featureCount;

	// Small maps inline their points, each carrying its chunk key
	if (count <= MAP_SOURCE_INLINE_LIMIT) {
		// Hash the un-stamped rows so inline keys match the equivalent API payload
		const sourceData = getLocationsMapSourceData(featureCollection);

		return {
			...defaultMapDataProps,
			hasGeodata: true,
			mapId,
			sourceData: getInlineSourceData(sourceData, chunkKeyById),
			sourceDataKey: hashMapSourceData(sourceData),
			apiChunkBaseUrl,
			featureCount,
			...mapBounds,
			...props,
			targetIds,
		} satisfies MapComponentData;
	}

	// Big maps fetch the shared index and keep only the rows their scope selects
	const apiSourceUrl = getBaseUrl(
		'api/map',
		`index.json?v=${import.meta.env.BUILD_VERSION ?? 'unknown'}`,
	);

	// No membership hint resolves to this map's explicit, order-preserving id list
	const resolvedScope: MapScope = scope ?? {
		type: 'ids',
		ids: featureCollection.features.map((feature) => String(feature.id)),
	};

	return {
		...defaultMapDataProps,
		hasGeodata: true,
		mapId,
		apiSourceUrl,
		scope: resolvedScope,
		apiChunkBaseUrl,
		prefetchUrls: [apiSourceUrl],
		featureCount,
		...mapBounds,
		...props,
		targetIds,
	} satisfies MapComponentData;
}

// Dedicated per-map source/popup endpoints; objectives uses this to keep hidden points off the shared index
export function getMapDataDedicated({
	mapId,
	featureCollection,
	...props
}: {
	mapId: string;
	featureCollection: MapFeatureCollection | undefined;
} & Pick<MapComponentProps, 'showObjectiveFilter'>): MapComponentData {
	const mapBounds = getMapBounds({ featureCollection });

	if (!featureCollection || !mapBounds) {
		return {
			...defaultMapDataProps,
			...props,
		} satisfies MapComponentData;
	}

	const sourceHash = hashMapSourceData(getLocationsMapSourceData(featureCollection));
	const popupHash = hashMapPopupData(getLocationsMapPopupData(featureCollection));
	const apiSourceUrl = getBaseUrl('api/map', mapId, `${MapApiDataEnum.Source}?v=${sourceHash}`);
	const apiPopupUrl = getBaseUrl('api/map', mapId, `${MapApiDataEnum.Popup}?v=${popupHash}`);

	return {
		...defaultMapDataProps,
		hasGeodata: true,
		mapId,
		apiSourceUrl,
		apiPopupUrl,
		prefetchUrls: [apiSourceUrl, apiPopupUrl],
		featureCount: featureCollection.features.length,
		...mapBounds,
		...props,
	} satisfies MapComponentData;
}
