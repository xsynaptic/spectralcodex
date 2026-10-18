import type { CollectionEntry } from 'astro:content';

import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';
import { countContent } from '#lib/utils/content-policy.ts';

export const getSeriesCollection = createCollectionData({
	collection: 'series',
	async compute() {
		const locations = await getRawCollection('locations');
		const posts = await getRawCollection('posts');

		return function computeSeries(entry: CollectionEntry<'series'>) {
			const seriesItems = new Set(entry.data.seriesItems);

			return countContent({
				locations: locations.filter(({ id }) => seriesItems.has(id)).map(({ id }) => id),
				posts: posts.filter(({ id }) => seriesItems.has(id)).map(({ id }) => id),
				unlistedLocationIds: new Set(),
			});
		};
	},
	label: 'Series',
});
