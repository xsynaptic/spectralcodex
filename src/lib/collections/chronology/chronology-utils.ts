import type {
	ChronologyDailyCounts,
	ChronologyMonthlyItem,
} from '#lib/collections/chronology/chronology-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import {
	getImageFeaturedGroup,
	getImageFeaturedGroupByCatalog,
} from '#lib/image/image-featured.ts';

// Adapt per-category daily counts to the generic activity graph: summed values plus year totals
export function getChronologyActivityData(dailyData: Record<string, ChronologyDailyCounts>): {
	values: Record<string, number>;
	totals: ChronologyDailyCounts;
} {
	const values: Record<string, number> = {};
	const totals: ChronologyDailyCounts = { created: 0, updated: 0, visited: 0 };

	for (const [dayKey, counts] of Object.entries(dailyData)) {
		values[dayKey] = counts.created + counts.updated + counts.visited;
		totals.created += counts.created;
		totals.updated += counts.updated;
		totals.visited += counts.visited;
	}

	return { values, totals };
}

/**
 * Resolve the image featured group for a chronology item
 * Uses a custom imageFeatured from the chronology entry if available, otherwise generates from highlights
 */
export async function createChronologyImageFeaturedGroupFunction() {
	const catalog = await getCatalog();

	return function getChronologyImageFeaturedGroup(item: ChronologyMonthlyItem) {
		return item.chronologyEntry?.data.imageFeatured
			? getImageFeaturedGroup({
					imageFeatured: item.chronologyEntry.data.imageFeatured,
					getCaption: catalog.getCaption,
				})
			: getImageFeaturedGroupByCatalog({ items: item.highlights });
	};
}
