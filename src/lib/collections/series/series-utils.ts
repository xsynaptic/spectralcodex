import type { CollectionEntry, CollectionKey } from 'astro:content';

import * as R from 'remeda';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import { getLocationsCollection } from '#lib/collections/locations/locations-data.ts';
import { createLocationsByPostsFunction } from '#lib/collections/locations/locations-utils.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { getSeriesCollection } from '#lib/collections/series/series-data.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import {
	createContentMetadataFunction,
	filterHasFeaturedImage,
} from '#lib/metadata/metadata-utils.ts';
import { createFilterEntryQualityFunction } from '#lib/utils/collections.ts';

// Filter the content metadata index for series items by ID
async function createSeriesContentMetadataItemsFunction() {
	const contentMetadataIndex = await getContentMetadataIndex();

	return function getSeriesContentMetadataItems(
		ids: Array<string> | undefined,
	): Array<ContentMetadataItem> | undefined {
		if (!ids || ids.length === 0) return;

		return ids
			.map((id) => (contentMetadataIndex.has(id) ? contentMetadataIndex.get(id) : undefined))
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

// Return all series containing a given entry; used to generate post and location metadata blocks
export async function createSeriesByIdFunction() {
	const { entries: series } = await getSeriesCollection();

	const getSeriesContentMetadataItems = await createSeriesContentMetadataItemsFunction();

	return function getSeriesById({
		collection,
		id,
	}: {
		collection: Extract<CollectionKey, 'locations' | 'posts'>;
		id: string;
	}): Array<{
		entry: CollectionEntry<'series'>;
		metadataItems: Array<ContentMetadataItem>;
	}> {
		// Note: a post or location may be in more than one series!
		const entries = series.filter((entry: CollectionEntry<'series'>) =>
			entry.data.seriesItems?.includes(id),
		);

		const results: Array<{
			entry: CollectionEntry<'series'>;
			metadataItems: Array<ContentMetadataItem>;
		}> = [];

		for (const entry of entries) {
			const metadataItems = getSeriesContentMetadataItems(entry.data.seriesItems);

			// This avoids returning series for a post or location with an identical ID
			if (metadataItems?.some((item) => item.id === id && item.collection === collection)) {
				results.push({ entry, metadataItems });
			}
		}
		return results;
	};
}

/**
 * Data for a single series entry page: metadata items, map data, and word count
 */
export async function createQuerySeriesEntryFunction() {
	const { entries: series } = await getSeriesCollection();

	const getContentMetadata = await createContentMetadataFunction();
	const getSeriesContentMetadataItems = await createSeriesContentMetadataItemsFunction();
	const getSeriesLocations = await createLocationsBySeriesFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();

	const seriesItemsMetadata = getContentMetadata(series);

	return function querySeriesEntry(entry: CollectionEntry<'series'>) {
		const metadataItems = getSeriesContentMetadataItems(entry.data.seriesItems);

		if (!metadataItems) return;

		const seriesLocations = getSeriesLocations(entry.data.seriesItems);
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: getLocationsFeatureCollection(seriesLocations),
			...(regionPrimary?.data._langCode?.startsWith('zh')
				? { languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional] }
				: {}),
		});

		const wordCount = seriesItemsMetadata.find((item) => item.id === entry.id)?.wordCount;

		return { metadataItems, mapData, wordCount };
	};
}

export async function querySeriesIndex() {
	const { entries: series } = await getSeriesCollection();

	const getContentMetadata = await createContentMetadataFunction();

	return R.pipe(
		series,
		R.filter(createFilterEntryQualityFunction(2)),
		R.sort((a, b) =>
			a.data.seriesItems && b.data.seriesItems
				? b.data.seriesItems.length - a.data.seriesItems.length
				: 0,
		),
		getContentMetadata,
	);
}
