import * as R from 'remeda';

import {
	filterHasFeaturedImage,
	sortContentMetadataByDate,
	sortContentMetadataByQuality,
} from '#lib/metadata/metadata-index-core.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

export async function queryIndexData() {
	const contentIndex = await getContentMetadataIndex();

	return {
		featuredMetadataItems: R.pipe(
			contentIndex.byCollection('locations', 'posts'),
			R.filter((item) => item.entryQuality >= 4),
			R.filter(filterHasFeaturedImage),
			R.shuffle(),
			R.take(5),
		),
		recentMetadataItems: R.pipe(
			contentIndex.byCollection('locations', 'posts'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(filterHasFeaturedImage),
			R.sort(sortContentMetadataByDate),
			R.take(16),
		),
		seriesMetadataItems: R.pipe(
			contentIndex.byCollection('series'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(filterHasFeaturedImage),
			R.sort(sortContentMetadataByQuality),
			R.take(4),
		),
		themesMetadataItems: R.pipe(
			contentIndex.byCollection('themes'),
			R.filter((item) => item.entryQuality >= 3),
			R.filter(filterHasFeaturedImage),
			R.sort(sortContentMetadataByQuality),
			R.take(8),
		),
	};
}
