import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

import { createArchivesData } from '#lib/collections/archives/archives-core.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

export const getArchivesData = pMemoize(async () => {
	const startTime = performance.now();

	const [contentIndex, archiveEntries] = await Promise.all([
		getContentMetadataIndex(),
		getCollection('archives'),
	]);

	const data = createArchivesData(contentIndex.all(), archiveEntries);

	console.log(`[Archives] Data generated in ${(performance.now() - startTime).toFixed(5)}ms`);

	return data;
});
