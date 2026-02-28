import * as R from 'remeda';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import { getImagesCollection } from '#lib/collections/images/images-data.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { formatNumber } from '#lib/utils/text.ts';

function getContentCounts(data: Array<ContentMetadataItem> | undefined) {
	return {
		itemCount: formatNumber({ number: data?.length ?? 0 }),
		wordCount: formatNumber({
			number: data?.reduce((previous, { wordCount }) => previous + (wordCount ?? 0), 0) ?? 0,
		}),
	};
}

export async function getContentStats() {
	const contentMetadataIndex = await getContentMetadataIndex();

	const contentMetadataArray = [...contentMetadataIndex.values()];

	const contentMetadataGroups = R.groupBy(contentMetadataArray, (item) => item.collection);

	const { entries: images } = await getImagesCollection();

	const contentStats = {
		ephemera: getContentCounts(contentMetadataGroups.ephemera),
		locations: {
			...getContentCounts(contentMetadataGroups.locations),
			withImages: formatNumber({
				number: contentMetadataGroups.locations?.filter((item) => item.imageId).length ?? 0,
			}),
		},
		pages: getContentCounts(contentMetadataGroups.pages),
		posts: getContentCounts(contentMetadataGroups.posts),
		regions: getContentCounts(contentMetadataGroups.regions),
		series: getContentCounts(contentMetadataGroups.series),
		themes: getContentCounts(contentMetadataGroups.themes),
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

	return {
		...contentStats,
		total: {
			...getContentCounts(contentMetadataArray),
		},
	};
}
