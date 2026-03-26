import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import {
	createContentMetadataFunction,
	filterHasFeaturedImage,
	sortContentMetadataByDate,
} from '#lib/metadata/metadata-utils.ts';
import {
	createCollectionLookupByIds,
	createFilterEntryQualityFunction,
	filterWithContent,
	sortByContentCount,
} from '#lib/utils/collections.ts';

export const createThemesByIdsFunction = createCollectionLookupByIds('Themes', getThemesCollection);

// Get posts that have a term
async function createPostsByThemeFunction() {
	const { entries } = await getPostsCollection();

	return function getPostsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'posts'>> {
		return entries.filter(({ data }) => data.themes?.find(({ id }) => id === entry.id));
	};
}

// Get locations that have a term
export async function createLocationsByThemeFunction() {
	const { entries } = await getLocationsCollection();

	return function getLocationsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'locations'>> {
		return entries.filter(({ data }) => data.themes?.find(({ id }) => id === entry.id));
	};
}

/**
 * Data for a single theme entry page: metadata items, map data, and related themes
 */
export async function createQueryThemesEntryFunction() {
	const { entries: locations } = await getLocationsCollection();
	const { entries: themes } = await getThemesCollection();

	const getPostsByTerm = await createPostsByThemeFunction();
	const getContentMetadata = await createContentMetadataFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	return function queryThemesEntry(entry: CollectionEntry<'themes'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		// Note: the need to get location data async means we should filter this first!
		const locationsFiltered = locations.filter(
			({ data }) => data.themes?.some(({ id }) => id === entry.id) ?? false,
		);

		const postsFiltered = getPostsByTerm(entry);

		// Metadata items are the posts and locations that are associated with the theme
		const metadataItemsFiltered = R.pipe(
			[
				...R.pipe(locationsFiltered, R.filter(createFilterEntryQualityFunction(2))),
				...postsFiltered,
			],
			getContentMetadata,
			R.filter(filterHasFeaturedImage),
			R.sort(sortContentMetadataByDate),
		);

		// Anything that wasn't included above
		const metadataItemsAll = R.pipe(
			[...locationsFiltered, ...postsFiltered],
			R.filter(({ id }) => !metadataItemsFiltered.some((item) => item.id === id)),
			getContentMetadata,
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

	const getContentMetadata = await createContentMetadataFunction();

	return R.pipe(
		entries,
		R.filter(filterWithContent),
		/** Only display themes with associated images */
		R.filter((entry) => !!entry.data.imageFeatured),
		R.sort(sortByContentCount),
		getContentMetadata,
	);
}
