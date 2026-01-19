import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

interface CollectionData {
	series: Array<CollectionEntry<'series'>>;
	seriesMap: Map<string, CollectionEntry<'series'>>;
}

export const getSeriesCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const locations = await getCollection('locations');
	const posts = await getCollection('posts');
	const series = await getCollection('series');

	const seriesMap = new Map<string, CollectionEntry<'series'>>();

	for (const entry of series) {
		entry.data.locationCount = locations.filter((location) =>
			entry.data.seriesItems?.includes(location.id),
		).length;
		entry.data.postCount = posts.filter((post) => entry.data.seriesItems?.includes(post.id)).length;

		seriesMap.set(entry.id, entry);
	}

	console.log(
		`[Series] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { series, seriesMap };
});
