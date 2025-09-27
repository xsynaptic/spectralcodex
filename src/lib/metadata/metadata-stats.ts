import * as R from 'remeda';

import { getImagesCollection } from '#lib/collections/images/data.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { formatNumber } from '#lib/utils/text.ts';

export async function getContentStats() {
	const contentMetadataIndex = await getContentMetadataIndex();

	const contentMetadataArray = [...contentMetadataIndex.values()];

	const contentMetadataGroups = R.groupBy(contentMetadataArray, (item) => item.collection);

	const { images } = await getImagesCollection();

	return {
		ephemera: formatNumber({ number: contentMetadataGroups.ephemera?.length ?? 0 }),
		locations: {
			itemCount: formatNumber({ number: contentMetadataGroups.locations?.length ?? 0 }),
			withImages: formatNumber({
				number: contentMetadataGroups.locations?.filter((item) => item.imageId).length ?? 0,
			}),
		},
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
			itemCount: formatNumber({ number: images.length }),
		},
		links: {
			itemCount: formatNumber({
				number: contentMetadataArray.reduce(
					(linksCountPrevious, { linksCount }) => linksCountPrevious + (linksCount ?? 0),
					0,
				),
			}),
		},
	};
}
