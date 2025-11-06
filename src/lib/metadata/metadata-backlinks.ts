import * as R from 'remeda';

import type { ContentMetadataItem } from '#lib/types/index.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { sortContentMetadataByDate } from '#lib/metadata/metadata-utils.ts';

export async function getContentBacklinksFunction() {
	const contentMetadataIndex = await getContentMetadataIndex();

	return function getContentBacklinks({ id }: { id: string }) {
		const contentMetadataItem = contentMetadataIndex.get(id);

		if (!contentMetadataItem || contentMetadataItem.backlinks.size === 0) return;

		const backlinkItems: Array<ContentMetadataItem> = [];

		for (const backlinkId of contentMetadataItem.backlinks) {
			const backlinkItem = contentMetadataIndex.get(backlinkId);

			if (backlinkItem) {
				backlinkItems.push(backlinkItem);
			}
		}

		const backlinks = R.pipe(
			backlinkItems,
			/** Limit backlinks to specific collections */
			R.filter((backlinkItem) =>
				['ephemera', 'locations', 'posts'].includes(backlinkItem.collection),
			),
			R.sort(sortContentMetadataByDate),
			R.take(10),
		);

		return backlinks;
	};
}
