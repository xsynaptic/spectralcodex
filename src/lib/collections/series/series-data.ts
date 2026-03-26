import { getCollection } from 'astro:content';

import { createCollectionData } from '#lib/utils/collections.ts';

export const getSeriesCollection = createCollectionData({
	collection: 'series',
	label: 'Series',
	async augment(entries) {
		const locations = await getCollection('locations');
		const posts = await getCollection('posts');

		for (const entry of entries) {
			entry.data._locationCount = locations.filter((location) =>
				entry.data.seriesItems?.includes(location.id),
			).length;
			entry.data._postCount = posts.filter((post) =>
				entry.data.seriesItems?.includes(post.id),
			).length;
		}
	},
});
