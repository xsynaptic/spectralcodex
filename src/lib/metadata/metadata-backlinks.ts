import type { ContentMetadataItem } from '@/types/metadata';

import { getContentMetadataIndex } from '@/lib/metadata/metadata-index';

// A specialized function for fetching backlink metadata
export async function getContentBacklinks({ id }: { id: string }) {
	const contentMetadataIndex = await getContentMetadataIndex();

	const contentMetadataItem = contentMetadataIndex.get(id);

	if (!contentMetadataItem || contentMetadataItem.backlinks.size === 0) return;

	const backlinkItems: ContentMetadataItem[] = [];

	for (const backlinkId of contentMetadataItem.backlinks) {
		const backlinkItem = contentMetadataIndex.get(backlinkId);

		if (backlinkItem) {
			backlinkItems.push(backlinkItem);
		}
	}
	return backlinkItems;
}
