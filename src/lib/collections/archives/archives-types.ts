import type { CollectionEntry } from 'astro:content';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

// Fields shared by both archive views
// A year summary (index view) carries exactly these; a monthly item adds the month-specific fields below
interface ArchivesYearSummary {
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

export interface ArchivesMonthlyItem extends ArchivesYearSummary {
	month: string;
	monthName: string;
	archiveEntry?: CollectionEntry<'archives'> | undefined;
}

export type ArchivesIndexData = Record<string, ArchivesYearSummary>;

export interface ArchivesDailyCounts {
	created: number;
	updated: number;
	visited: number;
}

export type ArchivesDailyData = Record<string, Record<string, ArchivesDailyCounts>>;
