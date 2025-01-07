import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import type { CollectionEntry } from 'astro:content';

interface CollectionData {
	images: Array<CollectionEntry<'images'>>;
	imagesMap: Map<string, CollectionEntry<'images'>>;
}

let collection: Promise<CollectionData> | undefined;

async function generateCollection() {
	const startTime = performance.now();

	const images = await getCollection('images');

	const imagesMap = new Map<string, CollectionEntry<'images'>>();

	R.forEach(images, (entry) => imagesMap.set(entry.id, entry));

	console.log(
		`[Images] Collection data generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { images, imagesMap };
}

export async function getImagesCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
