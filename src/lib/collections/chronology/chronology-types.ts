import type { CollectionEntry } from 'astro:content';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

// Fields shared by both chronology views
// A year summary (index view) carries exactly these; a monthly item adds the month-specific fields below
interface ChronologyYearSummary {
	id: string;
	title: string;
	year: string;
	highlights: Array<CatalogItem> | undefined;
	createdCount: number;
	updatedCount: number;
	visitedCount: number;
	created: Array<CatalogItem>;
	updated: Array<CatalogItem>;
	visited: Array<CatalogItem>;
}

export interface ChronologyMonthlyItem extends ChronologyYearSummary {
	month: string;
	monthName: string;
	chronologyEntry?: CollectionEntry<'chronology'> | undefined;
}

export type ChronologyIndexData = Record<string, ChronologyYearSummary>;

export interface ChronologyDailyCounts {
	created: number;
	updated: number;
	visited: number;
}

export type ChronologyDailyData = Record<string, Record<string, ChronologyDailyCounts>>;
