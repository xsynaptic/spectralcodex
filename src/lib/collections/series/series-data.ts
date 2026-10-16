import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';
import { populateContentCounts } from '#lib/utils/content-policy.ts';

export const getSeriesCollection = createCollectionData({
	collection: 'series',
	label: 'Series',
	async mutate(entries) {
		const locations = await getRawCollection('locations');
		const posts = await getRawCollection('posts');

		for (const entry of entries) {
			const seriesItems = new Set(entry.data.seriesItems);

			populateContentCounts(entry.data, {
				locations: locations.filter(({ id }) => seriesItems.has(id)).map(({ id }) => id),
				posts: posts.filter(({ id }) => seriesItems.has(id)).map(({ id }) => id),
				unlistedLocationIds: new Set(),
			});
		}
	},
});
