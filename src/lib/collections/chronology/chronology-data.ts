import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { createChronologyData } from '#lib/collections/chronology/chronology-factory.ts';
import { getRawCollection } from '#lib/utils/collections.ts';

export const getChronologyData = pMemoize(async () => {
	const startTime = performance.now();

	const [catalog, chronologyEntries] = await Promise.all([
		getCatalog(),
		getRawCollection('chronology'),
	]);

	const data = createChronologyData(catalog.all(), chronologyEntries);

	console.log(`[Chronology] Data generated in ${(performance.now() - startTime).toFixed(5)}ms`);

	return data;
});
