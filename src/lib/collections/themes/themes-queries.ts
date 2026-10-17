import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { buildEntryCatalogItems } from '#lib/catalog/catalog-utils.ts';
import { createLocationsByIdsFunction } from '#lib/collections/locations/locations-data.ts';
import { createPostsByIdsFunction } from '#lib/collections/posts/posts-data.ts';
import { getThemesCollection } from '#lib/collections/themes/themes-data.ts';
import { createEntryMapDataFunction } from '#lib/map/map-data.ts';
import { hasEntries, sortByEntryCount } from '#lib/utils/collections.ts';
import { isListed, isListedQuality } from '#lib/utils/content-policy.ts';

export async function createQueryThemesEntryFunction() {
	const { entries: themes } = await getThemesCollection();

	const getLocationsByTheme = await createLocationsByThemeFunction();
	const getPostsByTheme = await createPostsByThemeFunction();
	const catalog = await getCatalog();
	const getEntryMapData = await createEntryMapDataFunction();

	return function queryThemesEntry(entry: CollectionEntry<'themes'>) {
		const locationsFiltered = getLocationsByTheme(entry);
		const locationsListed = locationsFiltered.filter(({ data }) => isListed(data));

		const postsFiltered = getPostsByTheme(entry);

		const featuredCandidates = catalog.resolve([
			...R.pipe(
				locationsListed,
				R.filter((location) => isListedQuality(location.data)),
			),
			...postsFiltered,
		]);

		const restCandidates = catalog.resolve([...locationsListed, ...postsFiltered]);

		const { catalogItems, catalogItemsCount, catalogItemsFiltered } = buildEntryCatalogItems(
			featuredCandidates,
			restCandidates,
		);

		const mapData = getEntryMapData(entry);

		const relatedThemeIds = R.pipe(
			themes,
			R.filter((theme) => theme.data.themes?.some(({ id }) => id === entry.id) ?? false),
			R.sort(sortByEntryCount),
			R.map((theme) => theme.id),
		);

		const backlinksCount = catalog.backlinksOf(entry.id).length;

		return {
			backlinksCount,
			catalogItems,
			catalogItemsCount,
			catalogItemsFiltered,
			mapData,
			relatedThemeIds,
		};
	};
}

export async function queryThemesIndex() {
	const { entries } = await getThemesCollection();

	const catalog = await getCatalog();

	return R.pipe(
		entries,
		R.filter(hasEntries),
		R.filter((entry) => !!entry.data.imageFeatured),
		R.sort(sortByEntryCount),
		catalog.resolve,
	);
}

async function createLocationsByThemeFunction() {
	const getLocationsByIds = await createLocationsByIdsFunction();

	return function getLocationsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'locations'>> {
		return getLocationsByIds(entry.data._locations ?? []);
	};
}

async function createPostsByThemeFunction() {
	const getPostsByIds = await createPostsByIdsFunction();

	return function getPostsByTheme(
		entry: CollectionEntry<'themes'>,
	): Array<CollectionEntry<'posts'>> {
		return getPostsByIds(entry.data._posts ?? []);
	};
}
