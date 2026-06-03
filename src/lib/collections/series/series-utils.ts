import type { CollectionEntry, CollectionKey } from 'astro:content';

import * as R from 'remeda';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { filterHasFeaturedImage } from '#lib/catalog/catalog-utils.ts';
import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { createLocationsByPostsFunction } from '#lib/collections/locations/locations-utils.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';

// Filter the catalog for series items by ID
async function createSeriesCatalogItemsFunction() {
	const catalog = await getCatalog();

	return function getSeriesCatalogItems(
		ids: Array<string> | undefined,
	): Array<CatalogItem> | undefined {
		if (!ids || ids.length === 0) return;

		return ids
			.map((id) => catalog.getById(id))
			.filter((entry) => !!entry)
			.filter(filterHasFeaturedImage);
	};
}

// Generate geodata for series items; combines posts with multiple locations and individual locations
export async function createLocationsBySeriesFunction() {
	const { entriesMap: locationsMap } = await getLocationsCollection();
	const { entriesMap: postsMap } = await getPostsCollection();

	const getLocationsByPosts = await createLocationsByPostsFunction();

	return function getLocationsBySeries(
		seriesItemIds: Array<string> | undefined,
	): Array<CollectionEntry<'locations'>> {
		if (!seriesItemIds || seriesItemIds.length === 0) return [];

		const seriesLocationsMap = new Map<string, CollectionEntry<'locations'>>();

		for (const seriesItemId of seriesItemIds) {
			const location = locationsMap.get(seriesItemId);

			if (location) {
				if (!seriesLocationsMap.has(seriesItemId)) {
					seriesLocationsMap.set(seriesItemId, location);
				}
				continue;
			}

			const post = postsMap.get(seriesItemId);

			if (post) {
				const seriesPostsLocations = getLocationsByPosts(post);

				for (const seriesPostLocation of seriesPostsLocations) {
					if (!seriesLocationsMap.has(seriesPostLocation.id))
						seriesLocationsMap.set(seriesPostLocation.id, seriesPostLocation);
				}
				continue;
			}

			// In case nothing came up!
			throw new Error(`[Series] Requested item "${seriesItemId}" not found!`);
		}

		return [...seriesLocationsMap.values()];
	};
}

// Return all series containing a given entry; used to generate post and location catalog item blocks
export async function createSeriesByIdFunction() {
	const { entries: series } = await getSeriesCollection();

	const getSeriesCatalogItems = await createSeriesCatalogItemsFunction();

	return function getSeriesById({
		collection,
		id,
	}: {
		collection: Extract<CollectionKey, 'locations' | 'posts'>;
		id: string;
	}): Array<{
		entry: CollectionEntry<'series'>;
		catalogItems: Array<CatalogItem>;
	}> {
		// Note: a post or location may be in more than one series!
		const entries = series.filter((entry: CollectionEntry<'series'>) =>
			entry.data.seriesItems?.includes(id),
		);

		const results: Array<{
			entry: CollectionEntry<'series'>;
			catalogItems: Array<CatalogItem>;
		}> = [];

		for (const entry of entries) {
			const catalogItems = getSeriesCatalogItems(entry.data.seriesItems);

			// This avoids returning series for a post or location with an identical ID
			if (catalogItems?.some((item) => item.id === id && item.collection === collection)) {
				results.push({ entry, catalogItems });
			}
		}
		return results;
	};
}

/**
 * Data for a single series entry page: catalog items, map data, and word count
 */
export async function createQuerySeriesEntryFunction() {
	const { entries: series } = await getSeriesCollection();

	const catalog = await getCatalog();
	const getSeriesCatalogItems = await createSeriesCatalogItemsFunction();
	const getSeriesLocations = await createLocationsBySeriesFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	const seriesCatalogItems = catalog.resolve(series);

	return function querySeriesEntry(entry: CollectionEntry<'series'>) {
		const catalogItems = getSeriesCatalogItems(entry.data.seriesItems);

		if (!catalogItems) return;

		const seriesLocations = getSeriesLocations(entry.data.seriesItems);
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: getLocationsFeatureCollection(seriesLocations),
			...(regionPrimary?.data._langCode?.startsWith('zh')
				? { languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional] }
				: {}),
		});

		const wordCount = seriesCatalogItems.find((item) => item.id === entry.id)?.wordCount;

		return { catalogItems, mapData, wordCount };
	};
}

export async function querySeriesIndex() {
	const { entries: series } = await getSeriesCollection();

	const catalog = await getCatalog();

	return R.pipe(
		series,
		R.filter((entry) => entry.data.entryQuality >= 2),
		R.sort((a, b) =>
			a.data.seriesItems && b.data.seriesItems
				? b.data.seriesItems.length - a.data.seriesItems.length
				: 0,
		),
		catalog.resolve,
	);
}
