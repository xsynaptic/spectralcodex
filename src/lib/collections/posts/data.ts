import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

interface CollectionData {
	posts: Array<CollectionEntry<'posts'>>;
	postsMap: Map<string, CollectionEntry<'posts'>>;
}

export const getPostsCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const posts = await getCollection('posts');

	const postsMap = new Map<string, CollectionEntry<'posts'>>();

	for (const entry of posts) {
		postsMap.set(entry.id, entry);
	}

	console.log(
		`[Posts] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { posts, postsMap };
});
