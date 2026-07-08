import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';

export const getSeriesCollection = createCollectionData({
	collection: 'series',
	label: 'Series',
	async mutate(entries) {
		const locations = await getRawCollection('locations');
		const posts = await getRawCollection('posts');

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
