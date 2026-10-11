import type { MapComponentData, MapView } from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';

import pMemoize from 'p-memoize';

import { atlasPage } from '#lib/atlas/atlas-constants.ts';
import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';

export type AtlasPageProps =
	{ page: typeof atlasPage.map } | { page: typeof atlasPage.pane; view: MapView };

const atlasRegionId = 'taiwan';

const getAtlasLocationIds = pMemoize(async () => {
	const { entriesMap } = await getRegionsCollection();

	return new Set(entriesMap.get(atlasRegionId)?.data._locations);
});

async function getAtlasLocationView(
	entry: CollectionEntry<'locations'>,
	mapData: MapComponentData,
) {
	if (entry.data.hideLocation && contentPolicy.hideSensitiveLocations) return;
	if (!mapData.hasGeodata) return;

	const atlasLocationIds = await getAtlasLocationIds();

	if (!atlasLocationIds.has(entry.id)) return;

	return { targetIds: mapData.targetIds ?? [] };
}

async function getAtlasRegionView(
	regionId: string,
	mapData: MapComponentData,
): Promise<MapView | undefined> {
	const {
		regionsTree: { intervalById },
	} = await getRegionsCollection();

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

async function getAtlasView(
	entry: CollectionEntry<'locations' | 'regions'>,
	mapData: MapComponentData,
) {
	switch (entry.collection) {
		case 'locations': {
			return getAtlasLocationView(entry, mapData);
		}
		case 'regions': {
			return getAtlasRegionView(entry.id, mapData);
		}
	}
}

export async function getAtlasPage(
	entry: CollectionEntry<'locations' | 'regions'>,
	mapData: MapComponentData,
): Promise<AtlasPageProps | undefined> {
	const view = await getAtlasView(entry, mapData);

	return view ? { page: atlasPage.pane, view } : undefined;
}

// Memoized; every atlas page renders the island in its shell
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
