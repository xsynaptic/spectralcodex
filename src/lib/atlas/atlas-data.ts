import type { MapScope, MapView } from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';

import pMemoize from 'p-memoize';

import type { MapComponentData } from '#lib/map/map-types.ts';

import { atlasPage } from '#lib/atlas/atlas-constants.ts';
import {
	createLocationsByIdsFunction,
	createLocationsByPostsFunction,
} from '#lib/collections/locations/locations-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { createLocationsBySeriesFunction } from '#lib/collections/series/series-utils.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { getMapBounds } from '#lib/map/map-bounds.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getMapDirectoryData, getMapThemeIndexById } from '#lib/map/map-directory.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';
import { getContentPath } from '#lib/utils/routing.ts';

export type AtlasPageProps =
	{ page: typeof atlasPage.map } | { page: typeof atlasPage.pane; view: MapView };

const atlasRegionId = 'taiwan';

const getAtlasLocationIds = pMemoize(async () => {
	const { entriesMap } = await getRegionsCollection();

	return new Set(entriesMap.get(atlasRegionId)?.data._locations);
});

type AtlasEntry = CollectionEntry<'locations' | 'posts' | 'regions' | 'series' | 'themes'>;

function getAtlasScope(
	entry: AtlasEntry,
	rule: MapScope['rule'],
	frame: Pick<MapScope, 'apiDivisionUrl' | 'bounds'>,
) {
	return {
		...frame,
		rule,
		title: entry.data.title,
		url: getContentPath(entry.collection, entry.id),
	};
}

async function getAtlasLocationView(
	entry: CollectionEntry<'locations'>,
	mapData: MapComponentData,
) {
	if (entry.data.hideLocation && contentPolicy.hideSensitiveLocations) return;

	const atlasLocationIds = await getAtlasLocationIds();

	if (!atlasLocationIds.has(entry.id)) return;

	return { targetIds: mapData.props.targetIds ?? [] };
}

async function getAtlasRegionView(
	entry: CollectionEntry<'regions'>,
	mapData: MapComponentData,
): Promise<MapView | undefined> {
	const {
		regionsTree: { intervalById },
	} = await getRegionsCollection();

	const atlasInterval = intervalById.get(atlasRegionId);
	const interval = intervalById.get(entry.id);

	if (!atlasInterval || !interval) return;
	if (interval[0] < atlasInterval[0] || interval[1] > atlasInterval[1]) return;

	const { apiDivisionUrl, bounds } = mapData.props;

	return {
		// `mapData.props.mapFeaturesRule` is absent on a Region small enough to inline its rows
		scope: getAtlasScope(
			entry,
			{ interval, type: 'region' },
			{ ...(bounds ? { bounds } : {}), ...(apiDivisionUrl ? { apiDivisionUrl } : {}) },
		),
	};
}

async function getAtlasThemeView(entry: CollectionEntry<'themes'>): Promise<MapView | undefined> {
	const themeIndexById = await getMapThemeIndexById();
	const themeIndex = themeIndexById.get(entry.id);

	if (themeIndex === undefined) return;

	const atlasLocationIds = await getAtlasLocationIds();
	const getLocationsByIds = await createLocationsByIdsFunction();

	const locations = getLocationsByIds(
		(entry.data._locations ?? []).filter((id) => atlasLocationIds.has(id)),
	);
	// The page map's bounds would also cover the Theme's Locations outside Taiwan, which the atlas map does not show
	const bounds = getMapBounds({ featureCollection: getLocationsFeatureCollection(locations) });

	if (!bounds) return;

	return {
		scope: getAtlasScope(entry, { index: themeIndex, type: 'theme' }, { bounds: bounds.bounds }),
	};
}

async function getAtlasLocationsView(
	entry: CollectionEntry<'posts' | 'series'>,
	locations: Array<CollectionEntry<'locations'>>,
): Promise<MapView | undefined> {
	const atlasLocationIds = await getAtlasLocationIds();

	const featureCollection = getLocationsFeatureCollection(
		locations.filter(({ id }) => atlasLocationIds.has(id)),
	);
	const bounds = getMapBounds({ featureCollection });

	if (!featureCollection || !bounds) return;

	return {
		scope: getAtlasScope(
			entry,
			{
				ids: featureCollection.features.flatMap(({ id }) => (typeof id === 'string' ? [id] : [])),
				type: 'ids',
			},
			{ bounds: bounds.bounds },
		),
	};
}

async function getAtlasPostView(entry: CollectionEntry<'posts'>) {
	const getLocationsByPosts = await createLocationsByPostsFunction();

	return getAtlasLocationsView(entry, getLocationsByPosts(entry));
}

async function getAtlasSeriesView(entry: CollectionEntry<'series'>) {
	const getLocationsBySeries = await createLocationsBySeriesFunction();

	return getAtlasLocationsView(entry, getLocationsBySeries(entry.data.seriesItems));
}

async function getAtlasView(entry: AtlasEntry, mapData: MapComponentData) {
	switch (entry.collection) {
		case 'locations': {
			return getAtlasLocationView(entry, mapData);
		}
		case 'posts': {
			return getAtlasPostView(entry);
		}
		case 'regions': {
			return getAtlasRegionView(entry, mapData);
		}
		case 'series': {
			return getAtlasSeriesView(entry);
		}
		case 'themes': {
			return getAtlasThemeView(entry);
		}
	}
}

export async function getAtlasPage(
	entry: AtlasEntry,
	mapData: MapComponentData,
): Promise<AtlasPageProps | undefined> {
	if (!mapData.hasGeodata) return;

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
