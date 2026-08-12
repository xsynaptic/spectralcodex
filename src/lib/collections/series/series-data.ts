import { createCollectionData, getRawCollection } from '#lib/utils/collections.ts';

export const getSeriesCollection = createCollectionData({
	collection: 'series',
	label: 'Series',
	async mutate(entries) {
		const locations = await getRawCollection('locations');
		const posts = await getRawCollection('posts');
		const notes = await getRawCollection('notes');

		for (const entry of entries) {
			const seriesItems = new Set(entry.data.seriesItems);

			entry.data._locationCount = locations.filter(({ id }) => seriesItems.has(id)).length;
			entry.data._postCount = posts.filter(({ id }) => seriesItems.has(id)).length;
			entry.data._noteCount = notes.filter(({ id }) => seriesItems.has(id)).length;
			entry.data._entryCount =
				entry.data._locationCount + entry.data._postCount + entry.data._noteCount;
		}
	},
});
