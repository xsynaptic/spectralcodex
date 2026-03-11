import type { CollectionEntry } from 'astro:content';

import type { Thing } from '#lib/utils/structured-data.ts';

import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { createCollectionLookupByIds } from '#lib/utils/collections.ts';
import { buildArticleSchema, buildAuthorSchema } from '#lib/utils/structured-data.ts';

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
