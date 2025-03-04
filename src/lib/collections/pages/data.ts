import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';

interface CollectionData {
	pages: Array<CollectionEntry<'pages'>>;
}

let collection: Promise<CollectionData> | undefined;

async function generateCollection() {
	const startTime = performance.now();

	const pages = await getCollection('pages');

	console.log(
		`[Pages] Collection data generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { pages };
}

export async function getPagesCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
