import { getCollection } from 'astro:content';
import * as R from 'remeda';

import { createContentMetadataFunction } from '#lib/metadata/metadata-utils.ts';
import { createCollectionData } from '#lib/utils/collections.ts';
import { createFilterEntryQualityFunction } from '#lib/utils/collections.ts';

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

export async function querySeriesIndex() {
	const { entries: series } = await getSeriesCollection();

	const getContentMetadata = await createContentMetadataFunction();

	return R.pipe(
		series,
		R.filter(createFilterEntryQualityFunction(2)),
		R.sort((a, b) =>
			a.data.seriesItems && b.data.seriesItems
				? b.data.seriesItems.length - a.data.seriesItems.length
				: 0,
		),
		getContentMetadata,
	);
}
