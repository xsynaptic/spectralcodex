import type { MapView } from '@spectralcodex/react-map-component';
import type { CollectionEntry } from 'astro:content';

import { selectMapRows } from '@spectralcodex/map-codec';
import pMemoize from 'p-memoize';

import type { MapComponentData } from '#lib/map/map-data.ts';
import type { MapScopeEntry } from '#lib/map/map-entry-rules.ts';

import { atlasRegionId } from '#constants.ts';
import { atlasPage } from '#lib/atlas/atlas-constants.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { getMapScopeKey } from '#lib/map/map-scopes.ts';
import { isGeometryHidden } from '#lib/utils/content-policy.ts';

export type AtlasPageProps =
	{ page: typeof atlasPage.map } | { page: typeof atlasPage.pane; view: MapView };

export async function getAtlasLocationPage(
	entry: CollectionEntry<'locations'>,
	mapData: MapComponentData,
): Promise<AtlasPageProps | undefined> {
	if (!mapData.hasGeodata || isGeometryHidden(entry)) return;

	const { atlasRows } = await getMapDirectoryData();
	const targetIds = mapData.props.targetIds ?? [];

	if (selectMapRows(atlasRows, { ids: targetIds, type: 'ids' }).length === 0) return;

	return { page: atlasPage.pane, view: { targetIds } };
}

export async function getAtlasScopePage(entry: MapScopeEntry): Promise<AtlasPageProps | undefined> {
	const { mapScopeByKey } = await getMapDirectoryData();
	const scope = mapScopeByKey.get(getMapScopeKey(entry));

	return scope ? { page: atlasPage.pane, view: { scope } } : undefined;
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
