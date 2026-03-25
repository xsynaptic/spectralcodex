import { getCollection } from 'astro:content';
import * as R from 'remeda';

import { createContentMetadataFunction } from '#lib/metadata/metadata-utils.ts';
import { filterWithContent, sortByContentCount } from '#lib/utils/collections.ts';
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

export async function queryThemesIndex() {
	const { entries } = await getThemesCollection();

	const getContentMetadata = await createContentMetadataFunction();

	return R.pipe(
		entries,
		R.filter(filterWithContent),
		/** Only display themes with associated images */
		R.filter((entry) => !!entry.data.imageFeatured),
		R.sort(sortByContentCount),
		getContentMetadata,
	);
}
