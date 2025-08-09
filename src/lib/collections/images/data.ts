import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';

interface CollectionData {
	images: Array<CollectionEntry<'images'>>;
	imagesMap: Map<string, CollectionEntry<'images'>>;
}

let collection: Promise<CollectionData> | undefined;

async function generateCollection() {
	const startTime = performance.now();

	const images = await getCollection('images');

	const imagesMap = new Map<string, CollectionEntry<'images'>>();

	for (const entry of images) {
		imagesMap.set(entry.id, entry);
	}

	console.log(
		`[Images] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { images, imagesMap };
}

export async function getImagesCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
