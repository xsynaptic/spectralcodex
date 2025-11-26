import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

interface CollectionData {
	pages: Array<CollectionEntry<'pages'>>;
}

export const getPagesCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const pages = await getCollection('pages');

	console.log(
		`[Pages] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { pages };
});
