import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-utils.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-utils.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import {
	filterHasFeaturedImage,
	sortContentMetadataByDate,
} from '#lib/metadata/metadata-index-core.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
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
export async function createLocationsByThemeFunction() {
	const getLocationsByIds = await createLocationsByIdsFunction();

	return function getLocationsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'locations'>> {
		return getLocationsByIds(entry.data._locations ?? []);
	};
}

/**
 * Data for a single theme entry page: metadata items, map data, and related themes
 */
export async function createQueryThemesEntryFunction() {
	const { entries: themes } = await getThemesCollection();

	const getLocationsByTheme = await createLocationsByThemeFunction();
	const getPostsByTheme = await createPostsByThemeFunction();
	const contentIndex = await getContentMetadataIndex();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	return function queryThemesEntry(entry: CollectionEntry<'themes'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const locationsFiltered = getLocationsByTheme(entry);
		const locationsListed = locationsFiltered.filter(({ data }) => !data.hideIndex);

		const postsFiltered = getPostsByTheme(entry);

		// Metadata items are the posts and locations that are associated with the theme
		const metadataItemsFiltered = R.pipe(
			[
				...R.pipe(
					locationsListed,
					R.filter((location) => location.data.entryQuality >= 2),
				),
				...postsFiltered,
			],
			// Entries become metadata items below this point
			contentIndex.resolve,
			R.filter(filterHasFeaturedImage),
			R.sort(sortContentMetadataByDate),
		);

		// Anything that wasn't included above
		const metadataItemsAll = R.pipe(
			[...locationsListed, ...postsFiltered],
			R.filter(({ id }) => !metadataItemsFiltered.some((item) => item.id === id)),
			contentIndex.resolve,
			R.shuffle(),
		);
		const metadataItems = metadataItemsAll.slice(0, 25);
		const metadataItemsCount = metadataItemsAll.length;

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: getLocationsFeatureCollection(locationsFiltered),
			...(regionPrimary?.data._langCode?.startsWith('zh')
				? { languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional] }
				: {}),
		});

		// Related themes are those that reference the current theme
		const relatedThemeIds = R.pipe(
			themes,
			R.filter((theme) => theme.data.themes?.some(({ id }) => id === entry.id) ?? false),
			R.sort(sortByContentCount),
			R.map((theme) => theme.id),
		);

		return { metadataItemsFiltered, metadataItems, metadataItemsCount, mapData, relatedThemeIds };
	};
}

export async function queryThemesIndex() {
	const { entries } = await getThemesCollection();

	const contentIndex = await getContentMetadataIndex();

	return R.pipe(
		entries,
		R.filter(filterWithContent),
		/** Only display themes with associated images */
		R.filter((entry) => !!entry.data.imageFeatured),
		R.sort(sortByContentCount),
		contentIndex.resolve,
	);
}
