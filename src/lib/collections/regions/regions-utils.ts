import type { CollectionEntry, ReferenceDataEntry } from 'astro:content';

import * as R from 'remeda';

import type { Thing } from '#lib/utils/seo-structured-data.ts';

import { MAP_DIVISION_DATA_PATH } from '#constants.ts';
import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { buildEntryCatalogItems } from '#lib/catalog/catalog-utils.ts';
import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-utils.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-utils.ts';
import { getRegionsCollection } from '#lib/collections/regions/regions-data.ts';
import { getRegionsOptions } from '#lib/collections/regions/regions-options.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getMapIndexData, getMapRegionOrdinals } from '#lib/map/map-index.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { filterWithContent, sortByContentCount } from '#lib/utils/collections.ts';
import { getBaseUrl, getContentUrl, getSiteUrl } from '#lib/utils/routing.ts';
import { buildBreadcrumbSchema } from '#lib/utils/seo-structured-data.ts';

/**
 * Transform an array of strings into collection entries
 */
export async function createRegionsByIdsFunction() {
	const { entriesMap } = await getRegionsCollection();

	return function getRegionsById(ids: Array<string>) {
		return ids
			.map((id) => {
				const entry = entriesMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Regions] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((entry): entry is CollectionEntry<'regions'> => !!entry) satisfies Array<
			CollectionEntry<'regions'>
		>;
	};
}

/**
 * Hierarchical functions
 */
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

/**
 * Primary region
 */
// Return the first region from an array of region references
export async function createFirstRegionByReferenceFunction() {
	const { entriesMap } = await getRegionsCollection();

	return function getFirstRegionByReference(
		regions: Array<ReferenceDataEntry<'regions'>> | undefined,
	): CollectionEntry<'regions'> | undefined {
		if (!regions) return;

		const regionId = regions.at(0)?.id;

		return regionId ? entriesMap.get(regionId) : undefined;
	};
}

/**
 * Schema
 */
export async function getRegionSchema(
	entry: CollectionEntry<'regions'>,
	props: { url: string },
): Promise<Array<Thing>> {
	const t = getTranslations();

	const getRegionAncestors = await createRegionAncestorsFunction();

	const allAncestors = getRegionAncestors(entry);
	const ancestors = allAncestors.slice(1).toReversed();

	const breadcrumbItems = [
		{ name: t('site.title'), url: getSiteUrl() },
		{ name: t('collection.regions.labelPlural'), url: getSiteUrl('regions') },
		...ancestors.map((region) => ({
			name: region.data.title,
			url: getContentUrl('regions', region.id),
		})),
		{ name: entry.data.title },
	];

	return [buildBreadcrumbSchema(breadcrumbItems, props.url)];
}

/**
 * Data for a single region entry page: catalog items, map data, and display options
 */
export async function createQueryRegionsEntryFunction() {
	const getRegionAncestors = await createRegionAncestorsFunction();
	const getPostsByIds = await createPostsByIdsFunction();
	const getLocationsByIds = await createLocationsByIdsFunction();
	const catalog = await getCatalog();
	const { chunkKeyById } = await getMapIndexData();
	const { intervalById } = await getMapRegionOrdinals();

	// Note: this is temporary code to limit map display to specified regions
	const displayRegionMapIds = new Set(['taiwan', 'hong-kong', 'thailand', 'vietnam', 'canada']);

	return function queryRegionsEntry(entry: CollectionEntry<'regions'>) {
		const ancestors = getRegionAncestors(entry);

		const showRegionMap =
			displayRegionMapIds.has(entry.id) ||
			ancestors.some((ancestor) => displayRegionMapIds.has(ancestor.id));

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
			R.filter(({ data }) => !data.hideLocation),
			catalog.resolve,
		);

		const { catalogItemsFiltered, catalogItems, catalogItemsCount } = buildEntryCatalogItems(
			featuredCandidates,
			restCandidates,
		);

		const regionsOption = getRegionsOptions(ancestors.length);

		const regionInterval = intervalById.get(entry.id);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: showRegionMap ? getLocationsFeatureCollection(entryLocations) : undefined,
			locationCount: entryLocations.length,
			chunkKeyById,
			...(regionInterval ? { scope: { type: 'region', interval: regionInterval } } : {}),
			...(entry.data._langCode?.startsWith('zh')
				? {
						languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional],
					}
				: {}),
			...(entry.data.divisionId && !entry.data.hideDivision
				? {
						apiDivisionUrl: getBaseUrl(MAP_DIVISION_DATA_PATH, `${entry.id}.fgb`),
					}
				: {}),
		});

		return { catalogItemsFiltered, catalogItems, catalogItemsCount, mapData, regionsOption };
	};
}

/**
 * Filtered and sorted ancestral regions for the regions index page
 */
export async function queryRegionsIndex() {
	const { entries } = await getRegionsCollection();
	const catalog = await getCatalog();

	return R.pipe(
		entries,
		R.filter(({ data }) => data.parent === undefined),
		R.filter(filterWithContent),
		R.sort(sortByContentCount),
		catalog.resolve,
	);
}

/**
 * Related regions (children/siblings) filtered by content and sorted by content count
 */
export async function createQueryRegionsRelatedFunction() {
	const getRegionsByIds = await createRegionsByIdsFunction();

	return function queryRegionsRelated(ids: Array<string> | undefined, limit: number) {
		return ids
			? R.pipe(
					ids,
					getRegionsByIds,
					R.filter(filterWithContent),
					R.sort(sortByContentCount),
					R.take(limit),
				)
			: [];
	};
}
