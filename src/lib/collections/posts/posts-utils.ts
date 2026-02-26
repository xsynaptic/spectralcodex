import type { CollectionEntry } from 'astro:content';
import type { Thing, WithContext } from 'schema-dts';

import { getPostsCollection } from '#lib/collections/posts/posts-data.ts';
import { buildArticleSchema } from '#lib/utils/schema.ts';

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getPostsByIdsFunction() {
	const { postsMap } = await getPostsCollection();

	return function getPostsById(ids: Array<string>) {
		return ids
			.map((id) => {
				const entry = postsMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Posts] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter((entry): entry is CollectionEntry<'posts'> => !!entry) satisfies Array<
			CollectionEntry<'posts'>
		>;
	};
}

export function getPostSchemas(
	entry: CollectionEntry<'posts'>,
	props: { url: string; imageUrl: string | undefined },
): Array<WithContext<Thing>> {
	return [
		buildArticleSchema({
			title: entry.data.title,
			description: entry.data.description ?? entry.body ?? undefined,
			dateCreated: entry.data.dateCreated,
			dateUpdated: entry.data.dateUpdated,
			url: props.url,
			imageUrl: props.imageUrl,
		}),
	];
}
