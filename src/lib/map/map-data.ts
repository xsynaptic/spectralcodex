import type {
	MapComponentData,
	MapComponentProps,
	MapScope,
	MapSourceItemInput,
} from '@spectralcodex/react-map-component';
import type { BBox } from 'geojson';
import type { LngLatBoundsLike } from 'maplibre-gl';

import { MapDataKeysCompressed } from '@spectralcodex/shared/map';
import { bbox } from '@turf/bbox';
import { buffer } from '@turf/buffer';
import { center as turfCenter } from '@turf/center';
import { distance } from '@turf/distance';
import { truncate } from '@turf/truncate';
import { MAP_PROTOMAPS_API_KEY } from 'astro:env/client';
import { IMAGE_SERVER_URL } from 'astro:env/server';

import type { MapFeatureCollection } from '#lib/map/map-types.ts';

import { MAP_SOURCE_INLINE_LIMIT } from '#constants.ts';
import {
	getLocationsMapApiHashes,
	getLocationsMapPopupData,
	getLocationsMapSourceData,
} from '#lib/map/map-locations.ts';
import { MapApiDataEnum } from '#lib/map/map-types.ts';
import { getTruncatedLngLat } from '#lib/map/map-utils.ts';
import { getBaseUrl } from '#lib/utils/routing.ts';

// Region and theme maps pass a membership hint; other big maps fall back to an id list
type MapScopeHint =
	{ type: 'region'; interval: [number, number] } | { type: 'theme'; index: number };

// Stamp each inline source row with its shared popup-chunk key so hover/click can fetch the chunk
function getInlineSourceData(
	featureCollection: MapFeatureCollection,
	chunkKeyById: Map<string, string> | undefined,
): Array<MapSourceItemInput> | undefined {
	const sourceData = getLocationsMapSourceData(featureCollection);
	if (!sourceData || !chunkKeyById) return sourceData;

	return sourceData.map((item) => {
		const chunkKey = chunkKeyById.get(item[MapDataKeysCompressed.Id]);
		return chunkKey ? { ...item, [MapDataKeysCompressed.ChunkKey]: chunkKey } : item;
	});
}

interface MapDataBoundsProps {
	featureCollection: MapFeatureCollection | undefined;
	boundsBuffer?: number | undefined;
	boundsBufferPercentage?: number | undefined;
	limitsBuffer?: number | undefined;
	limitsBufferPercentage?: number | undefined;
	targetId?: string | undefined; // Optional: use for centering on a specific point
}

const mapBoundsBufferMin = 1;
const mapLimitsBufferMin = 10;

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

// GeoJSON bounding boxes can have 6 items in the array; MapLibre only supports 4
function isLngLatBoundsLike(input: unknown): input is LngLatBoundsLike {
	return (
		!!input &&
		Array.isArray(input) &&
		input.length === 4 &&
		input.every((item) => typeof item === 'number')
	);
}

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
}: MapDataBoundsProps):
	| {
			center: [number, number];
			bounds: [number, number, number, number];
			maxBounds: [number, number, number, number];
	  }
	| undefined {
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
	let boundsBufferCollection: ReturnType<typeof buffer>;
	let limitsBufferCollection: ReturnType<typeof buffer>;

	if (boundsBuffer && limitsBuffer) {
		boundsBufferCollection = buffer(featureCollection, boundsBuffer);
		limitsBufferCollection = buffer(featureCollection, limitsBuffer);
	} else {
		// Note: single points will have a fixed buffer
		if (featureCollection.features.length === 1) {
			boundsBufferCollection = buffer(featureCollection, boundsBuffer ?? mapBoundsBufferMin);
			limitsBufferCollection = buffer(featureCollection, limitsBuffer ?? mapLimitsBufferMin);
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
				boundsBuffer ?? Math.max(mapBoundsBufferMin, spanMax * (boundsBufferPercentage / 100)),
			);
			limitsBufferCollection = buffer(
				featureCollection,
				limitsBuffer ?? Math.max(mapLimitsBufferMin, spanMax * (limitsBufferPercentage / 100)),
			);
		}
	}

	if (boundsBufferCollection && limitsBufferCollection) {
		bounds = bbox(boundsBufferCollection);
		maxBounds = bbox(limitsBufferCollection);
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
		const { sourceHash, popupHash } = getLocationsMapApiHashes(featureCollection);

		return {
			...defaultMapDataProps,
			hasGeodata: true,
			sourceData: getLocationsMapSourceData(featureCollection),
			popupData: getLocationsMapPopupData(featureCollection),
			sourceDataKey: sourceHash,
			popupDataKey: popupHash,
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
		const { sourceHash } = getLocationsMapApiHashes(featureCollection);

		return {
			...defaultMapDataProps,
			hasGeodata: true,
			mapId,
			sourceData: getInlineSourceData(featureCollection, chunkKeyById),
			sourceDataKey: sourceHash,
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

	const { sourceHash, popupHash } = getLocationsMapApiHashes(featureCollection);
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
