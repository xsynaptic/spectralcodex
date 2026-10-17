import type { MapFeaturesRule } from '@spectralcodex/map-codec';
import type { CollectionEntry } from 'astro:content';

import pMemoize from 'p-memoize';

import {
	createLocationsByPostsFunction,
	createLocationsBySeriesFunction,
} from '#lib/collections/locations/locations-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { getLocationsMapRule, getRegionMapRule, getThemeMapRule } from '#lib/map/map-locations.ts';

export type MapScopeEntry = CollectionEntry<'posts' | 'regions' | 'series' | 'themes'>;

export const getMapThemeIndexById = pMemoize(async () => {
	const { entries: themes } = await getThemesCollection();
	const themeIndexById = new Map<string, number>();
	const sortedThemeIds = themes.map((entry) => entry.id).toSorted((a, b) => a.localeCompare(b));

	for (const [index, id] of sortedThemeIds.entries()) {
		themeIndexById.set(id, index);
	}
	return themeIndexById;
});

export async function createEntryMapRuleFunction() {
	const { regionsTree } = await getRegionsCollection();
	const themeIndexById = await getMapThemeIndexById();
	const getLocationsByPosts = await createLocationsByPostsFunction();
	const getLocationsBySeries = await createLocationsBySeriesFunction();

	return function getEntryMapRule(entry: MapScopeEntry): MapFeaturesRule {
		switch (entry.collection) {
			case 'posts': {
				return getLocationsMapRule(getLocationsByPosts(entry));
			}
			case 'regions': {
				return getRegionMapRule(regionsTree.intervalById, entry.id);
			}
			case 'series': {
				return getLocationsMapRule(getLocationsBySeries(entry.data.seriesItems));
			}
			case 'themes': {
				return getThemeMapRule(themeIndexById, entry.id);
			}
		}
	};
}
