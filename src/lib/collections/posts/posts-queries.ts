import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { isEditorialEntry } from '#lib/catalog/catalog-utils.ts';
import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createEntryMapDataFunction } from '#lib/map/map-data.ts';
import { isListedQuality } from '#lib/utils/content-policy.ts';
import { sortByDateReverseChronological } from '#lib/utils/date.ts';

export async function createQueryPostsEntryFunction() {
	const catalog = await getCatalog();
	const getEntryMapData = await createEntryMapDataFunction();

	return function queryPostsEntry(entry: CollectionEntry<'posts'>) {
		const mapData = getEntryMapData(entry);

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
