import type {
	ChronologyDailyCounts,
	ChronologyMonthlyItem,
} from '#lib/collections/chronology/chronology-types.ts';
import type { Pagination } from '#lib/utils/pagination-types.ts';

import { getCatalog } from '#lib/catalog/catalog-data.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import {
	getImageFeaturedGroup,
	getImageFeaturedGroupByCatalog,
} from '#lib/image/image-featured.ts';
import { getSitePath } from '#lib/utils/routing.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

export function getChronologyYearPagination(
	years: Array<string>,
	currentYear?: string,
	currentMonth?: string,
) {
	const t = getTranslations();

	// A select cannot re-pick its selected option, so a month page selects nothing to keep its year reachable
	const selectedYear = currentMonth ? undefined : currentYear;

	const pagination: Pagination = {
		label: t('chronology.yearly.label'),
		options: years
			.toSorted((yearA, yearB) => yearB.localeCompare(yearA))
			.map((year) => ({
				isCurrent: year === selectedYear,
				label: year,
				url: getSitePath('chronology', year),
			})),
		selectLabel: t('chronology.yearly.select.label'),
		submitLabel: t('site.pagination.select.submit'),
	};

	if (pagination.options.every((option) => !option.isCurrent)) {
		pagination.placeholder = t('chronology.yearly.select.placeholder');
	}

	const currentIndex = pagination.options.findIndex((option) => option.label === currentYear);

	if (currentIndex === -1) return pagination;

	const olderOption = pagination.options[currentIndex + 1];
	const newerOption = pagination.options[currentIndex - 1];

	if (olderOption) {
		pagination.previous = {
			ariaLabel: formatStringTemplate(t('chronology.yearly.older'), { year: olderOption.label }),
			label: olderOption.label,
			url: olderOption.url,
		};
	}

	if (newerOption) {
		pagination.next = {
			ariaLabel: formatStringTemplate(t('chronology.yearly.newer'), { year: newerOption.label }),
			label: newerOption.label,
			url: newerOption.url,
		};
	}

	return pagination;
}

// Adapt per-category daily counts to the generic activity graph: summed values plus year totals
export function getChronologyActivityData(dailyData: Record<string, ChronologyDailyCounts>): {
	totals: ChronologyDailyCounts;
	values: Record<string, number>;
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
