import type {
	MapFeaturesRule,
	MapScope,
	MapScopeRow,
	MapSourceItem,
} from '@spectralcodex/map-codec';

import { selectMapRows } from '@spectralcodex/map-codec';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';
import type { MapScopeEntry } from '#lib/map/map-entry-rules.ts';

import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { getRegionsCollection, getRegionsTree } from '#lib/collections/regions/regions-data.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { getMultilingualContent } from '#lib/i18n/i18n-utils.ts';
import { getMapBounds } from '#lib/map/map-bounds.ts';
import { createEntryMapRuleFunction } from '#lib/map/map-entry-rules.ts';
import { isEntryMapEnabled } from '#lib/map/map-locations.ts';
import { getContentPath } from '#lib/utils/routing.ts';

type ScopeRowEntry = Exclude<MapScopeEntry, ComputedEntry<'posts'>>;

const scopeKindByCollection = { regions: 'region', series: 'series', themes: 'theme' } as const;

async function getRegionFields(entry: ScopeRowEntry) {
	if (entry.collection !== 'regions') return {};

	const { entriesMap } = await getRegionsCollection();
	const regionsTree = await getRegionsTree();
	const parentId = regionsTree.parentOf(entry.id);
	const parentTitle = parentId ? entriesMap.get(parentId)?.data.title : undefined;

	return parentTitle ? { parentTitle } : {};
}

export function getMapScopeKey(entry: Pick<MapScopeEntry, 'collection' | 'id'>) {
	return `${entry.collection}/${entry.id}`;
}

async function getScopeRow(
	entry: ScopeRowEntry,
	rule: MapFeaturesRule,
	count: number,
): Promise<MapScopeRow> {
	const titleMultilingual = getMultilingualContent({ data: entry.data, prop: 'title' })?.primary;

	return {
		count,
		id: entry.id,
		...(rule.type === 'region' ? { interval: rule.interval } : {}),
		kind: scopeKindByCollection[entry.collection],
		title: entry.data.title,
		url: getContentPath(entry.collection, entry.id),
		...(await getRegionFields(entry)),
		...(titleMultilingual ? { titleMultilingual: titleMultilingual.value } : {}),
	};
}

export async function buildMapScopes(atlasRows: ReadonlyArray<MapSourceItem>) {
	const { entries: posts } = await getPostsCollection();
	const { entries: regions } = await getRegionsCollection();
	const { entries: themes } = await getThemesCollection();
	const { entries: series } = await getSeriesCollection();
	const getEntryMapRule = await createEntryMapRuleFunction();

	const scopes: Array<{ entry: MapScopeEntry; row?: MapScopeRow; scope: MapScope }> = [];

	for (const entry of [...regions, ...themes, ...series, ...posts]) {
		if (!isEntryMapEnabled(entry)) continue;

		const rule = getEntryMapRule(entry);
		const entryRows = selectMapRows(atlasRows, rule);
		const bounds = getMapBounds(entryRows)?.bounds;

		if (!bounds) continue;

		const scope = {
			bounds,
			rule,
			title: entry.data.title,
			url: getContentPath(entry.collection, entry.id),
		};

		scopes.push(
			entry.collection === 'posts'
				? { entry, scope }
				: { entry, row: await getScopeRow(entry, rule, entryRows.length), scope },
		);
	}

	return scopes;
}
