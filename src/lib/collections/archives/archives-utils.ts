import type { ArchivesMonthlyItem } from '#lib/collections/archives/archives-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import {
	getImageFeaturedGroup,
	getImageFeaturedGroupByCatalog,
} from '#lib/image/image-featured.ts';

/**
 * Resolve the image featured group for an archive item
 * Uses a custom imageFeatured from the archive entry if available, otherwise generates from highlights
 */
export async function createArchivesImageFeaturedGroupFunction() {
	const catalog = await getCatalog();

	return function getArchivesImageFeaturedGroup(item: ArchivesMonthlyItem) {
		return item.archiveEntry?.data.imageFeatured
			? getImageFeaturedGroup({
					imageFeatured: item.archiveEntry.data.imageFeatured,
					getCaption: catalog.getCaption,
				})
			: getImageFeaturedGroupByCatalog({ items: item.highlights });
	};
}
