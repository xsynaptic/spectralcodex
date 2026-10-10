import type { MapComponentData, MapView } from '@spectralcodex/react-map-component';

import pMemoize from 'p-memoize';

import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';

const atlasRegionId = 'taiwan';

export const getAtlasLocationIds = pMemoize(async () => {
	const { entriesMap } = await getRegionsCollection();

	return new Set(entriesMap.get(atlasRegionId)?.data._locations);
});

export function getAtlasRegionView(
	regionId: string,
	mapData: MapComponentData,
	intervalById: ReadonlyMap<string, [number, number]>,
): MapView | undefined {
	const atlasInterval = intervalById.get(atlasRegionId);
	const interval = intervalById.get(regionId);

	if (!atlasInterval || !interval || !mapData.hasGeodata) return;
	if (interval[0] < atlasInterval[0] || interval[1] > atlasInterval[1]) return;

	return {
		// `mapData.mapFeaturesRule` is absent on a Region small enough to inline its rows
		pageFeaturesRule: { interval, type: 'region' },
		...(mapData.bounds ? { bounds: mapData.bounds } : {}),
		...(mapData.apiDivisionUrl ? { apiDivisionUrl: mapData.apiDivisionUrl } : {}),
	};
}

// Memoized; every page renders the atlas island in its shell
export const getAtlasMapData = pMemoize(async (): Promise<MapComponentData> => {
	const { entriesMap, regionsTree } = await getRegionsCollection();
	const getLocationsByIds = await createLocationsByIdsFunction();
	const { chunkKeyById, version } = await getMapDirectoryData();

	const region = entriesMap.get(atlasRegionId);

	if (!region) {
		throw new Error(`Error: could not find "${atlasRegionId}" in the "regions" collection.`);
	}

	const regionInterval = regionsTree.intervalById.get(region.id);
	const locations = getLocationsByIds(region.data._locations ?? []);

	return getMapData({
		chunkKeyById,
		featureCollection: getLocationsFeatureCollection(locations),
		locationCount: locations.length,
		mapId: 'atlas',
		version,
		...(regionInterval ? { mapFeaturesRule: { interval: regionInterval, type: 'region' } } : {}),
		...getMapLanguages(region.data._langCode),
	});
});
