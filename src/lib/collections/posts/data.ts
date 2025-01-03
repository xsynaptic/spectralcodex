import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import type { CollectionEntry } from 'astro:content';

interface CollectionData {
	posts: CollectionEntry<'posts'>[];
	postsMap: Map<string, CollectionEntry<'posts'>>;
}

let collection: Promise<CollectionData> | undefined;

async function generateCollection() {
	const startTime = performance.now();

	const posts = await getCollection('posts');

	const postsMap = new Map<string, CollectionEntry<'posts'>>();

	R.forEach(posts, (entry) => postsMap.set(entry.id, entry));

	console.log(
		`[Posts] Collection data generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { posts, postsMap };
}

export async function getPostsCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
