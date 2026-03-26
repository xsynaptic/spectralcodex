import type { ArchivesMonthlyItem } from '#lib/collections/archives/archives-types.ts';

import {
	getImageFeaturedGroup,
	getImageFeaturedGroupByContentMetadata,
} from '#lib/image/image-featured.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

/**
 * Resolve the image featured group for an archive item
 * Uses a custom imageFeatured from the archive entry if available, otherwise generates from highlights
 */
export async function createArchivesImageFeaturedGroupFunction() {
	const contentMetadataIndex = await getContentMetadataIndex();

	return function getArchivesImageFeaturedGroup(item: ArchivesMonthlyItem) {
		return item.archiveEntry?.data.imageFeatured
			? getImageFeaturedGroup({
					imageFeatured: item.archiveEntry.data.imageFeatured,
					contentMetadataIndex,
				})
			: getImageFeaturedGroupByContentMetadata({ items: item.highlights });
	};
}
