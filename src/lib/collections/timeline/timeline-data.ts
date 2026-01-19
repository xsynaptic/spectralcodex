import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

interface CollectionData {
	timelineEntries: Array<CollectionEntry<'timeline'>>;
	timelineEntriesMap: Map<string, CollectionEntry<'timeline'>>;
}

export const getTimelineCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const timelineEntries = await getCollection('timeline');

	const timelineEntriesMap = new Map<string, CollectionEntry<'timeline'>>();

	for (const entry of timelineEntries) {
		timelineEntriesMap.set(entry.id, entry);
	}

	console.log(
		`[Timeline] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { timelineEntries, timelineEntriesMap };
});
