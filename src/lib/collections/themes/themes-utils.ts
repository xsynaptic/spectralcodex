import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { buildEntryCatalogItems } from '#lib/catalog/catalog-utils.ts';
import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-utils.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-utils.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getMapIndexData, getMapThemeIndexById } from '#lib/map/map-index.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import {
	createCollectionLookupByIds,
	filterWithContent,
	sortByContentCount,
} from '#lib/utils/collections.ts';

export const createThemesByIdsFunction = createCollectionLookupByIds('Themes', getThemesCollection);

// Get posts that have a term
async function createPostsByThemeFunction() {
	const getPostsByIds = await createPostsByIdsFunction();

	return function getPostsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'posts'>> {
		return getPostsByIds(entry.data._posts ?? []);
	};
}

// Get locations that have a term
async function createLocationsByThemeFunction() {
	const getLocationsByIds = await createLocationsByIdsFunction();

	return function getLocationsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'locations'>> {
		return getLocationsByIds(entry.data._locations ?? []);
	};
}

/**
 * Data for a single theme entry page: catalog items, map data, and related themes
 */
export async function createQueryThemesEntryFunction() {
	const { entries: themes } = await getThemesCollection();

	const getLocationsByTheme = await createLocationsByThemeFunction();
	const getPostsByTheme = await createPostsByThemeFunction();
	const catalog = await getCatalog();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const { chunkKeyById } = await getMapIndexData();
	const themeIndexById = await getMapThemeIndexById();

	return function queryThemesEntry(entry: CollectionEntry<'themes'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const locationsFiltered = getLocationsByTheme(entry);
		const locationsListed = locationsFiltered.filter(({ data }) => !data.hideIndex);

		const postsFiltered = getPostsByTheme(entry);

		// Catalog items are the posts and locations that are associated with the theme
		const featuredCandidates = catalog.resolve([
			...R.pipe(
				locationsListed,
				R.filter((location) => location.data.entryQuality >= 2),
			),
			...postsFiltered,
		]);

		const restCandidates = catalog.resolve([...locationsListed, ...postsFiltered]);

		const { catalogItemsFiltered, catalogItems, catalogItemsCount } = buildEntryCatalogItems(
			featuredCandidates,
			restCandidates,
		);

		const themeIndex = themeIndexById.get(entry.id);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: getLocationsFeatureCollection(locationsFiltered),
			locationCount: locationsFiltered.length,
			chunkKeyById,
			...(themeIndex === undefined ? {} : { scope: { type: 'theme', index: themeIndex } }),
			...(regionPrimary?.data._langCode?.startsWith('zh')
				? {
						languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional],
					}
				: {}),
		});

		// Related themes are those that reference the current theme
		const relatedThemeIds = R.pipe(
			themes,
			R.filter((theme) => theme.data.themes?.some(({ id }) => id === entry.id) ?? false),
			R.sort(sortByContentCount),
			R.map((theme) => theme.id),
		);

		return { catalogItemsFiltered, catalogItems, catalogItemsCount, mapData, relatedThemeIds };
	};
}

export async function queryThemesIndex() {
	const { entries } = await getThemesCollection();

	const catalog = await getCatalog();

	return R.pipe(
		entries,
		R.filter(filterWithContent),
		/** Only display themes with associated images */
		R.filter((entry) => !!entry.data.imageFeatured),
		R.sort(sortByContentCount),
		catalog.resolve,
	);
}
