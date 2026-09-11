import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { Thing } from '#lib/utils/seo-structured-data.ts';

import { mapDisplayRegionIds, mapDivisionsDataPath } from '#constants.ts';
import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { buildEntryCatalogItems } from '#lib/catalog/catalog-utils.ts';
import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-data.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-data.ts';
import {
	createRegionsByIdsFunction,
	getRegionsCollection,
} from '#lib/collections/regions/regions-data.ts';
import { getRegionsOptions } from '#lib/collections/regions/regions-options.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getMapDirectoryData } from '#lib/map/map-directory.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { hasEntries, sortByEntryCount } from '#lib/utils/collections.ts';
import { contentPolicy } from '#lib/utils/content-policy.ts';
import { getBasePath } from '#lib/utils/routing.ts';
import { buildEntryBreadcrumbSchema } from '#lib/utils/seo-structured-data.ts';

// Get all ancestors of the specified region
export async function createRegionAncestorsFunction() {
	const getRegionsById = await createRegionsByIdsFunction();

	return function getRegionAncestors(region: CollectionEntry<'regions'>) {
		const ancestors = region.data._ancestors ? getRegionsById(region.data._ancestors) : [];

		return [region, ...ancestors] satisfies Array<CollectionEntry<'regions'>>;
	};
}

// References are not the complete entry; they still need to be fetched from the collection
export async function createRegionAncestorsByIdFunction() {
	const { entriesMap } = await getRegionsCollection();
	const getRegionAncestors = await createRegionAncestorsFunction();

	return function getRegionAncestorsById(regionId: string) {
		const region = entriesMap.get(regionId);

		if (!region)
			throw new Error(`Error: could not find "${regionId}" in the "regions" collection.`);

		return getRegionAncestors(region) satisfies Array<CollectionEntry<'regions'>>;
	};
}

export async function getRegionSchema(
	entry: CollectionEntry<'regions'>,
	props: { url: string },
): Promise<Array<Thing>> {
	const getRegionAncestors = await createRegionAncestorsFunction();

	const allAncestors = getRegionAncestors(entry);
	const ancestors = allAncestors.slice(1).toReversed();

	return [
		buildEntryBreadcrumbSchema({
			collection: 'regions',
			title: entry.data.title,
			url: props.url,
			regions: ancestors,
		}),
	];
}

// Data for a single region entry page: catalog items, map data, and display options
export async function createQueryRegionsEntryFunction() {
	const getRegionAncestors = await createRegionAncestorsFunction();
	const getPostsByIds = await createPostsByIdsFunction();
	const getLocationsByIds = await createLocationsByIdsFunction();
	const catalog = await getCatalog();
	const { chunkKeyById, version } = await getMapDirectoryData();
	const { regionsTree } = await getRegionsCollection();

	return function queryRegionsEntry(entry: CollectionEntry<'regions'>) {
		const ancestors = getRegionAncestors(entry);

		const shouldShowRegionMap =
			mapDisplayRegionIds.has(entry.id) ||
			ancestors.some((ancestor) => mapDisplayRegionIds.has(ancestor.id));

		const entryLocations = entry.data._locations ? getLocationsByIds(entry.data._locations) : [];
		const entryLocationsListed = entryLocations.filter(({ data }) => !data.hideIndex);

		const featuredCandidates = [
			...R.pipe(
				entryLocationsListed,
				R.filter((location) => location.data.entryQuality >= 2),
				catalog.resolve,
			),
			...R.pipe(entry.data._posts ?? [], getPostsByIds, catalog.resolve),
		];

		const restCandidates = R.pipe(
			entryLocationsListed,
			R.filter(({ data }) => !(contentPolicy.hideSensitiveLocations && data.hideLocation)),
			catalog.resolve,
		);

		const { catalogItemsFiltered, catalogItems, catalogItemsCount } = buildEntryCatalogItems(
			featuredCandidates,
			restCandidates,
		);

		const regionsOption = getRegionsOptions(ancestors.length);

		const regionInterval = regionsTree.intervalById.get(entry.id);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: shouldShowRegionMap
				? getLocationsFeatureCollection(entryLocations)
				: undefined,
			locationCount: entryLocations.length,
			chunkKeyById,
			version,
			...(regionInterval ? { scope: { type: 'region', interval: regionInterval } } : {}),
			...getMapLanguages(entry.data._langCode),
			...(entry.data.divisionId && !entry.data.hideDivision
				? {
						apiDivisionUrl: getBasePath(mapDivisionsDataPath, `${entry.id}.fgb`),
					}
				: {}),
		});

		const backlinksCount = catalog.backlinksOf(entry.id).length;

		return {
			catalogItemsFiltered,
			catalogItems,
			catalogItemsCount,
			mapData,
			regionsOption,
			backlinksCount,
		};
	};
}

// Filtered and sorted ancestral regions for the regions index page
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

// Related regions (children/siblings) filtered by content and sorted by content count
export async function createQueryRegionsRelatedFunction() {
	const getRegionsByIds = await createRegionsByIdsFunction();

	return function queryRegionsRelated(ids: Array<string> | undefined, limit: number) {
		return ids
			? R.pipe(ids, getRegionsByIds, R.filter(hasEntries), R.sort(sortByEntryCount), R.take(limit))
			: [];
	};
}
