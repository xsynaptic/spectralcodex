import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { MapComponentData } from '#lib/map/map-data.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { buildEntryCatalogItems } from '#lib/catalog/catalog-utils.ts';
import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-data.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-data.ts';
import {
	createRegionAncestorsFunction,
	createRegionsByIdsFunction,
	getRegionsCollection,
} from '#lib/collections/regions/regions-data.ts';
import { getRegionsOptions } from '#lib/collections/regions/regions-options.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { getRegionMapRule, hasEntryMap } from '#lib/map/map-locations.ts';
import { hasEntries, sortByEntryCount } from '#lib/utils/collections.ts';
import { isListed, isListedQuality } from '#lib/utils/content-policy.ts';

export async function createQueryRegionsEntryFunction() {
	const getRegionAncestors = await createRegionAncestorsFunction();
	const getPostsByIds = await createPostsByIdsFunction();
	const getLocationsByIds = await createLocationsByIdsFunction();
	const catalog = await getCatalog();
	const getMapData = await createMapDataFunction();
	const { regionsTree } = await getRegionsCollection();
	const { divisionUrlById } = await getMapDirectoryData();

	return function queryRegionsEntry(entry: CollectionEntry<'regions'>) {
		const ancestors = getRegionAncestors(entry);
		const divisionUrl = divisionUrlById.get(entry.id);

		const entryLocations = entry.data._locations ? getLocationsByIds(entry.data._locations) : [];
		const entryLocationsListed = entryLocations.filter(({ data }) => isListed(data));

		const featuredCandidates = [
			...R.pipe(
				entryLocationsListed,
				R.filter((location) => isListedQuality(location.data)),
				catalog.resolve,
			),
			...R.pipe(entry.data._posts ?? [], getPostsByIds, catalog.resolve),
		];

		const restCandidates = catalog.resolve(entryLocationsListed);

		const { catalogItems, catalogItemsCount, catalogItemsFiltered } = buildEntryCatalogItems(
			featuredCandidates,
			restCandidates,
		);

		const regionsOption = getRegionsOptions(ancestors.length);

		const mapData = hasEntryMap(entry)
			? getMapData({
					mapId: `${entry.collection}/${entry.id}`,
					rule: getRegionMapRule(regionsTree.intervalById, entry.id),
					...getMapLanguages(entry.data._langCode),
					...(divisionUrl ? { apiDivisionUrl: divisionUrl } : {}),
				})
			: ({ hasGeodata: false } satisfies MapComponentData);

		const backlinksCount = catalog.backlinksOf(entry.id).length;

		return {
			backlinksCount,
			catalogItems,
			catalogItemsCount,
			catalogItemsFiltered,
			mapData,
			regionsOption,
		};
	};
}

export async function createRegionsRelatedFunction() {
	const getRegionsByIds = await createRegionsByIdsFunction();

	return function getRegionsRelated(ids: Array<string> | undefined, limit: number) {
		return ids
			? R.pipe(ids, getRegionsByIds, R.filter(hasEntries), R.sort(sortByEntryCount), R.take(limit))
			: [];
	};
}

export async function queryRegionsIndex() {
	const { entries } = await getRegionsCollection();
	const catalog = await getCatalog();

	return R.pipe(
		entries,
		R.filter(({ data }) => data.parent === undefined),
		R.filter(hasEntries),
		R.sort(sortByEntryCount),
		catalog.resolve,
	);
}
