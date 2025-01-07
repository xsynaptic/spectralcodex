import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import * as R from 'remeda';

import type { CollectionEntry } from 'astro:content';

interface CollectionData {
	series: Array<CollectionEntry<'series'>>;
}

let collection: Promise<CollectionData> | undefined;

async function generateCollection() {
	const startTime = performance.now();

	const series = await getCollection('series');

	const locations = await getCollection('locations');
	const posts = await getCollection('posts');

	R.forEach(series, (entry) => {
		entry.data.locationCount = locations.filter((location) =>
			entry.data.seriesItems?.includes(location.id),
		).length;
		entry.data.postCount = posts.filter((post) => entry.data.seriesItems?.includes(post.id)).length;
	});

	console.log(
		`[Series] Collection data generated in ${Number(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { series };
}

export async function getSeriesCollection() {
	if (!collection) {
		collection = generateCollection();
	}
	return collection;
}
