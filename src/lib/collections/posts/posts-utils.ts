import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { Thing } from '#lib/utils/seo-structured-data.ts';

import { createLocationsByPostsFunction } from '#lib/collections/locations/locations-utils.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-utils.ts';
import { LanguageCodeEnum } from '#lib/i18n/i18n-types.ts';
import { getMapData } from '#lib/map/map-data.ts';
import { getLocationsFeatureCollection } from '#lib/map/map-locations.ts';
import { createContentBacklinksFunction } from '#lib/metadata/metadata-backlinks.ts';
import {
	createContentMetadataFunction,
	sortContentMetadataByDate,
} from '#lib/metadata/metadata-utils.ts';
import {
	createCollectionLookupByIds,
	createFilterEntryQualityFunction,
} from '#lib/utils/collections.ts';
import { buildArticleSchema, buildAuthorSchema } from '#lib/utils/seo-structured-data.ts';

export const createPostsByIdsFunction = createCollectionLookupByIds('Posts', getPostsCollection);

export function getPostSchema(
	entry: CollectionEntry<'posts'>,
	props: { url: string; imageUrl: string | undefined },
): Array<Thing> {
	return [
		buildArticleSchema({
			title: entry.data.title,
			description: entry.data.description ?? entry.body ?? undefined,
			dateCreated: entry.data.dateCreated,
			dateUpdated: entry.data.dateUpdated,
			url: props.url,
			imageUrl: props.imageUrl,
		}),
		buildAuthorSchema(),
	];
}

/**
 * Data for a single post entry page: map data and backlinks
 */
export async function createQueryPostsEntryFunction() {
	const getLocationsByPosts = await createLocationsByPostsFunction();
	const getFirstRegionByReference = await createFirstRegionByReferenceFunction();
	const getContentBacklinks = await createContentBacklinksFunction();

	return function queryPostsEntry(entry: CollectionEntry<'posts'>) {
		const regionPrimary = getFirstRegionByReference(entry.data.regions);

		const mapData = getMapData({
			mapId: `${entry.collection}/${entry.id}`,
			featureCollection: R.pipe(entry, getLocationsByPosts, getLocationsFeatureCollection),
			...(regionPrimary?.data._langCode?.startsWith('zh')
				? { languages: [LanguageCodeEnum.English, LanguageCodeEnum.ChineseTraditional] }
				: {}),
		});

		const backlinks = getContentBacklinks({ id: entry.id });

		return { mapData, backlinks };
	};
}

export async function queryPostsIndex() {
	const { entries } = await getPostsCollection();

	const getContentMetadata = await createContentMetadataFunction();

	return R.pipe(
		entries,
		R.filter(createFilterEntryQualityFunction(2)),
		getContentMetadata,
		R.sort(sortContentMetadataByDate),
	);
}
