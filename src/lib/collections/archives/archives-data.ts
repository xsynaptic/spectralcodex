import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { createArchivesData } from '#lib/collections/archives/archives-core.ts';

export const getArchivesData = pMemoize(async () => {
	const startTime = performance.now();

	const [catalog, archiveEntries] = await Promise.all([getCatalog(), getCollection('archives')]);

	const data = createArchivesData(catalog.all(), archiveEntries);

	console.log(`[Archives] Data generated in ${(performance.now() - startTime).toFixed(5)}ms`);

	return data;
});
