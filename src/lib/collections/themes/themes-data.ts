import { getCollection } from 'astro:content';

import { createCollectionData } from '#lib/utils/collections.ts';

export const getThemesCollection = createCollectionData({
	collection: 'themes',
	label: 'Themes',
	async augment(entries) {
		const locations = await getCollection('locations');
		const posts = await getCollection('posts');

		for (const entry of entries) {
			entry.data._locationCount = locations.filter((location) =>
				location.data.themes?.some(({ id }) => id === entry.id),
			).length;
			entry.data._postCount = posts.filter((post) =>
				post.data.themes?.some(({ id }) => id === entry.id),
			).length;
		}
	},
});
