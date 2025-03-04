import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';

interface CollectionData {
	ephemera: Array<CollectionEntry<'ephemera'>>;
}

let collection: Promise<CollectionData> | undefined;

async function generateCollection() {
	const startTime = performance.now();

	const ephemera = await getCollection('ephemera');

	console.log(
		`[Ephemera] Collection data generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { ephemera };
}

export async function getEphemeraCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
