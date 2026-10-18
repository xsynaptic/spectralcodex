import type { MapFeaturesRule } from '@spectralcodex/map-codec';

import pMemoize from 'p-memoize';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import {
	createLocationsByPostsFunction,
	createLocationsBySeriesFunction,
} from '#lib/collections/locations/locations-data.ts';
import { getRegionsTree } from '#lib/collections/regions/regions-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { getLocationsMapRule, getRegionMapRule, getThemeMapRule } from '#lib/map/map-locations.ts';

export type MapScopeEntry = ComputedEntry<'posts' | 'regions' | 'series' | 'themes'>;

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
	const regionsTree = await getRegionsTree();
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
