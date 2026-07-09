import type {
	ArchivesDailyCounts,
	ArchivesMonthlyItem,
} from '#lib/collections/archives/archives-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import {
	getImageFeaturedGroup,
	getImageFeaturedGroupByCatalog,
} from '#lib/image/image-featured.ts';

// Adapt per-category daily counts to the generic activity graph: summed values plus year totals
export function getArchivesActivityData(dailyData: Record<string, ArchivesDailyCounts>): {
	values: Record<string, number>;
	totals: ArchivesDailyCounts;
} {
	const values: Record<string, number> = {};
	const totals: ArchivesDailyCounts = { created: 0, updated: 0, visited: 0 };

	for (const [dayKey, counts] of Object.entries(dailyData)) {
		values[dayKey] = counts.created + counts.updated + counts.visited;
		totals.created += counts.created;
		totals.updated += counts.updated;
		totals.visited += counts.visited;
	}

	return { values, totals };
}

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
