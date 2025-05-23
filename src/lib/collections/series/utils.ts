import type { CollectionEntry, CollectionKey } from 'astro:content';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import { getLocationsCollection } from '#lib/collections/locations/data.ts';
import { getLocationsByPostsFunction } from '#lib/collections/locations/utils.ts';
import { getPostsCollection } from '#lib/collections/posts/data.ts';
import { getSeriesCollection } from '#lib/collections/series/data.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { filterHasFeaturedImage } from '#lib/metadata/metadata-utils.ts';

// Filter the content metadata index for series items by ID
export async function getSeriesContentMetadataItemsFunction() {
	const contentMetadataIndex = await getContentMetadataIndex();

	return function getSeriesContentMetadataItems(ids: Array<string> | undefined) {
		if (!ids || ids.length === 0) return;

		return ids
			.map((id) => (contentMetadataIndex.has(id) ? contentMetadataIndex.get(id) : undefined))
			.filter((entry): entry is ContentMetadataItem => !!entry)
			.filter(filterHasFeaturedImage) satisfies Array<ContentMetadataItem>;
	};
}

// Generate geodata for series items; combines posts with multiple locations and individual locations
export async function getLocationsBySeriesFunction() {
	const { locationsMap } = await getLocationsCollection();
	const { postsMap } = await getPostsCollection();

	const getLocationsByPosts = await getLocationsByPostsFunction();

	return function getLocationsBySeries(seriesItemIds: Array<string> | undefined) {
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
export async function getSeriesByIdFunction() {
	const { series } = await getSeriesCollection();

	const getSeriesContentMetadataItems = await getSeriesContentMetadataItemsFunction();

	return function getSeriesById({
		collection,
		id,
	}: {
		collection: Extract<CollectionKey, 'locations' | 'posts'>;
		id: string;
	}) {
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
