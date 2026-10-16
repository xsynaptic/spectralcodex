import type { MapFeaturesRule, MapScopeRow, MapSourceItem } from '@spectralcodex/map-codec';
import type { CollectionEntry } from 'astro:content';

import { selectMapRows } from '@spectralcodex/map-codec';

import { createLocationsBySeriesFunction } from '#lib/collections/locations/locations-data.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getMapBounds } from '#lib/map/map-bounds.ts';
import {
	getLocationsMapRule,
	getRegionMapRule,
	getThemeMapRule,
	hasEntryMap,
} from '#lib/map/map-locations.ts';
import { getContentPath } from '#lib/utils/routing.ts';

type ScopeListEntry = CollectionEntry<'regions' | 'series' | 'themes'>;

const scopeKindByCollection = { regions: 'region', series: 'series', themes: 'theme' } as const;

async function getRegionFields(entry: ScopeListEntry) {
	if (entry.collection !== 'regions') return {};

	const { entriesMap, regionsTree } = await getRegionsCollection();
	const parentId = regionsTree.parentOf(entry.id);
	const parentTitle = parentId ? entriesMap.get(parentId)?.data.title : undefined;

	return parentTitle ? { parentTitle } : {};
}

export async function buildAtlasScopeList(
	atlasRows: ReadonlyArray<MapSourceItem>,
	themeIndexById: ReadonlyMap<string, number>,
) {
	const { entries: regions, regionsTree } = await getRegionsCollection();
	const { entries: themes } = await getThemesCollection();
	const { entries: series } = await getSeriesCollection();
	const getLocationsBySeries = await createLocationsBySeriesFunction();

	function getScopeRule(entry: ScopeListEntry): MapFeaturesRule {
		switch (entry.collection) {
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
	}

	const rows: Array<MapScopeRow> = [];

	for (const entry of [...regions, ...themes, ...series]) {
		if (!hasEntryMap(entry)) continue;

		const rule = getScopeRule(entry);
		const entryRows = selectMapRows(atlasRows, rule);

		if (!getMapBounds(entryRows)) continue;

		const count = entryRows.length;

		const titleMultilingual = getMultilingualContent({ data: entry.data, prop: 'title' })?.primary;

		rows.push({
			count,
			id: entry.id,
			...(rule.type === 'region' ? { interval: rule.interval } : {}),
			kind: scopeKindByCollection[entry.collection],
			title: entry.data.title,
			url: getContentPath(entry.collection, entry.id),
			...(await getRegionFields(entry)),
			...(titleMultilingual ? { titleMultilingual: titleMultilingual.value } : {}),
		});
	}

	return rows;
}
