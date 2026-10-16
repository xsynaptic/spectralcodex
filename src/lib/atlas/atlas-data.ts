import type { MapSourceItem } from '@spectralcodex/map-codec';
import type { MapComponentProps, MapView } from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';

import { selectMapRows } from '@spectralcodex/map-codec';
import pMemoize from 'p-memoize';

import type { MapComponentData } from '#lib/map/map-data.ts';

import { atlasRegionId } from '#constants.ts';
import { atlasPage } from '#lib/atlas/atlas-constants.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { getMapBounds } from '#lib/map/map-bounds.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { isLocationHidden } from '#lib/utils/content-policy.ts';
import { getContentPath } from '#lib/utils/routing.ts';

export type AtlasPageProps =
	{ page: typeof atlasPage.map } | { page: typeof atlasPage.pane; view: MapView };

type AtlasEntry = CollectionEntry<'locations' | 'posts' | 'regions' | 'series' | 'themes'>;

function getAtlasLocationView(
	entry: CollectionEntry<'locations'>,
	atlasRows: ReadonlyArray<MapSourceItem>,
	props: MapComponentProps,
): MapView | undefined {
	if (isLocationHidden(entry)) return;

	const targetIds = props.targetIds ?? [];

	if (selectMapRows(atlasRows, { ids: targetIds, type: 'ids' }).length === 0) return;

	return { targetIds };
}

function getAtlasScopeView(
	entry: Exclude<AtlasEntry, CollectionEntry<'locations'>>,
	atlasRows: ReadonlyArray<MapSourceItem>,
	props: MapComponentProps,
): MapView | undefined {
	const rule = props.mapFeaturesRule;
	const rows = selectMapRows(atlasRows, rule);

	if (rows.length === 0) return;

	const bounds = getMapBounds(rows)?.bounds;

	return {
		scope: {
			rule,
			title: entry.data.title,
			url: getContentPath(entry.collection, entry.id),
			...(bounds ? { bounds } : {}),
			...(props.apiDivisionUrl ? { apiDivisionUrl: props.apiDivisionUrl } : {}),
		},
	};
}

export async function getAtlasPage(
	entry: AtlasEntry,
	mapData: MapComponentData,
): Promise<AtlasPageProps | undefined> {
	if (!mapData.hasGeodata) return;

	const { atlasRows } = await getMapDirectoryData();
	const view =
		entry.collection === 'locations'
			? getAtlasLocationView(entry, atlasRows, mapData.props)
			: getAtlasScopeView(entry, atlasRows, mapData.props);

	return view ? { page: atlasPage.pane, view } : undefined;
}

export const getAtlasMapData = pMemoize(async (): Promise<MapComponentData> => {
	const { entriesMap } = await getRegionsCollection();
	const { atlasRule } = await getMapDirectoryData();
	const getMapData = await createMapDataFunction();

	const region = entriesMap.get(atlasRegionId);

	if (!region) {
		throw new Error(`Error: could not find "${atlasRegionId}" in the "regions" collection.`);
	}

	return getMapData({
		mapId: 'atlas',
		rule: atlasRule,
		...getMapLanguages(region.data._langCode),
	});
});
