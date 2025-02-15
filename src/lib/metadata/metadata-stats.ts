import * as R from 'remeda';

import { getImageCount } from '@/lib/image/image-stats';
import { getContentMetadataIndex } from '@/lib/metadata/metadata-index';
import { formatNumber } from '@/lib/utils/text';

export async function getContentStats() {
	const contentMetadataIndex = await getContentMetadataIndex();

	const contentMetadataArray = [...contentMetadataIndex.values()];

	const contentMetadataGroups = R.groupBy(contentMetadataArray, (item) => item.collection);

	const imageCount = await getImageCount();

	return {
		ephemera: formatNumber({ number: contentMetadataGroups.ephemera?.length ?? 0 }),
		locations: formatNumber({ number: contentMetadataGroups.locations?.length ?? 0 }),
		pages: formatNumber({ number: contentMetadataGroups.pages?.length ?? 0 }),
		posts: {
			itemCount: formatNumber({ number: contentMetadataGroups.posts?.length ?? 0 }),
			wordCount: formatNumber({
				number: contentMetadataGroups.posts
					? R.pipe(
							contentMetadataGroups.posts,
							R.map((item) => item.wordCount ?? 0),
							R.sum,
							Number,
						)
					: 0,
			}),
		},
		regions: formatNumber({ number: contentMetadataGroups.regions?.length ?? 0 }),
		series: formatNumber({ number: contentMetadataGroups.series?.length ?? 0 }),
		themes: formatNumber({ number: contentMetadataGroups.themes?.length ?? 0 }),
		images: {
			itemCount: formatNumber({ number: imageCount }),
		},
	};
}
