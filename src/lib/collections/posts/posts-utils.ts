import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { Thing } from '#lib/utils/seo-structured-data.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { isEditorialEntry } from '#lib/catalog/catalog-utils.ts';
import { createLocationsByPostsFunction } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getLocationsMapRule } from '#lib/map/map-locations.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';
import { getDescriptionRenderedText } from '#lib/utils/description-data.ts';
import {
	buildArticleSchema,
	buildAuthorSchema,
	buildEntryBreadcrumbSchema,
} from '#lib/utils/seo-structured-data.ts';

export async function createQueryPostsEntryFunction() {
	const getLocationsByPosts = await createLocationsByPostsFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const catalog = await getCatalog();
	const getMapData = await createMapDataFunction();

	return function queryPostsEntry(entry: CollectionEntry<'posts'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const postLocations = getLocationsByPosts(entry);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			rule: getLocationsMapRule(postLocations),
			...getMapLanguages(regionPrimary?.data._langCode),
		});

		const backlinks = catalog.backlinksOf(entry.id).filter(isEditorialEntry);

		return { backlinks, mapData };
	};
}

export function getPostSchema(
	entry: CollectionEntry<'posts'>,
	props: { imageUrl: string | undefined; url: string },
): Array<Thing> {
	return [
		buildEntryBreadcrumbSchema({
			collection: 'posts',
			title: entry.data.title,
			url: props.url,
		}),
		buildArticleSchema({
			dateCreated: entry.data.dateCreated,
			dateUpdated: entry.data.dateUpdated,
			description: getDescriptionRenderedText(entry),
			imageUrl: props.imageUrl,
			title: entry.data.title,
			url: props.url,
		}),
		buildAuthorSchema(),
	];
}

export async function queryPostsIndex() {
	const { entries } = await getPostsCollection();

	return R.pipe(
		entries,
		R.filter((entry) => entry.data.entryQuality >= 2),
		R.sort(sortByDateReverseChronological),
	);
}
