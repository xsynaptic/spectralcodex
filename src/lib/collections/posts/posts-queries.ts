import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { isEditorialEntry } from '#lib/catalog/catalog-utils.ts';
import { createLocationsByPostsFunction } from '#lib/collections/locations/locations-data.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createFirstRegionByReferenceFunction } from '#lib/collections/regions/regions-data.ts';
import { getMapLanguages } from '#lib/i18n/i18n-utils.ts';
import { createMapDataFunction } from '#lib/map/map-data.ts';
import { getLocationsMapRule } from '#lib/map/map-locations.ts';
import { isListedQuality } from '#lib/utils/content-policy.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';

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

export async function queryPostsIndex() {
	const { entries } = await getPostsCollection();

	return R.pipe(
		entries,
		R.filter((entry) => isListedQuality(entry.data)),
		R.sort(sortByDateReverseChronological),
	);
}
