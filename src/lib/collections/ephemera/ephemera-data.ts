import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

interface CollectionData {
	ephemera: Array<CollectionEntry<'ephemera'>>;
}

export const getEphemeraCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const ephemera = await getCollection('ephemera');

	console.log(
		`[Ephemera] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { ephemera };
});
