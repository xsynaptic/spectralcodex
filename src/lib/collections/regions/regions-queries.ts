import * as R from 'remeda';

import type { ComputedEntry } from '#lib/collections/collections-types.ts';

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
import { createEntryMapDataFunction } from '#lib/map/map-data.ts';
import { hasEntries, sortByEntryCount } from '#lib/utils/collections.ts';
import { isListed, isListedQuality } from '#lib/utils/content-policy.ts';

export async function createQueryRegionsEntryFunction() {
	const getRegionAncestors = await createRegionAncestorsFunction();
	const getPostsByIds = await createPostsByIdsFunction();
	const getLocationsByIds = await createLocationsByIdsFunction();
	const catalog = await getCatalog();
	const getEntryMapData = await createEntryMapDataFunction();

	return function queryRegionsEntry(entry: ComputedEntry<'regions'>) {
		const ancestors = getRegionAncestors(entry);

		const entryLocations = getLocationsByIds(entry.data._locations);
		const entryLocationsListed = entryLocations.filter(({ data }) => isListed(data));

		const featuredCandidates = [
			...R.pipe(
				entryLocationsListed,
				R.filter((location) => isListedQuality(location.data)),
				catalog.resolve,
			),
			...R.pipe(entry.data._posts, getPostsByIds, catalog.resolve),
		];

		const restCandidates = catalog.resolve(entryLocationsListed);

		const { catalogItems, catalogItemsCount, catalogItemsFiltered } = buildEntryCatalogItems(
			featuredCandidates,
			restCandidates,
		);

		const regionsOption = getRegionsOptions(ancestors.length);

		const mapData = getEntryMapData(entry);

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

	return function getRegionsRelated(ids: Array<string>, limit: number) {
		return R.pipe(
			ids,
			getRegionsByIds,
			R.filter(hasEntries),
			R.sort(sortByEntryCount),
			R.take(limit),
		);
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
