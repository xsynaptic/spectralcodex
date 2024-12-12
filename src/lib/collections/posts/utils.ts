import type { CollectionEntry } from 'astro:content';

import { getPostsCollection } from '@/lib/collections/posts/data';

// Transform IDs into entries (and emit a warning when an ID doesn't match)
export async function getPostsByIdsFunction() {
	const { postsMap } = await getPostsCollection();

	return function getPostsById(ids: string[]) {
		return ids
			.map((id) => {
				const entry = postsMap.get(id);

				if (!entry && import.meta.env.DEV) {
					console.warn(`[Posts] Requested entry "${id}" not found!`);
				}
				return entry;
			})
			.filter(
				(entry): entry is CollectionEntry<'posts'> => !!entry,
			) satisfies CollectionEntry<'posts'>[];
	};
}
