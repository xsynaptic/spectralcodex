import type { CollectionEntry } from 'astro:content';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

export interface ChronologyDailyCounts {
	created: number;
	updated: number;
	visited: number;
}

export type ChronologyDailyData = Record<string, Record<string, ChronologyDailyCounts>>;

export type ChronologyIndexData = Record<string, ChronologyYearSummary>;

export interface ChronologyMonthlyItem extends ChronologyYearSummary {
	chronologyEntry?: CollectionEntry<'chronology'> | undefined;
	month: string;
	monthName: string;
}

// Fields shared by both chronology views
// A year summary (index view) carries exactly these; a monthly item adds the month-specific fields below
interface ChronologyYearSummary {
	created: Array<CatalogItem>;
	createdCount: number;
	highlights: Array<CatalogItem> | undefined;
	id: string;
	title: string;
	updated: Array<CatalogItem>;
	updatedCount: number;
	visited: Array<CatalogItem>;
	visitedCount: number;
	year: string;
}
