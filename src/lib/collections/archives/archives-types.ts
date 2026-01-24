import type { CollectionEntry } from 'astro:content';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

/**
 * Archives
 */
export interface ArchivesBaseItem {
	year: string;
	month: string;
	monthName: string;
	title: string; // _e.g._ "January 2025"
	highlights: Array<ContentMetadataItem> | undefined;
	createdCount: number;
	updatedCount: number;
	visitedCount: number;
}

export interface ArchivesMonthlyItem extends ArchivesBaseItem {
	created: Array<ContentMetadataItem>;
	updated: Array<ContentMetadataItem>;
	visited: Array<ContentMetadataItem>;
	archiveEntry?: CollectionEntry<'archives'> | undefined;
}

export interface ArchivesData {
	archivesIndexData: Record<string, ArchivesMonthlyItem>;
	archivesMonthlyData: Array<ArchivesMonthlyItem>;
	archivesYearlyData: Record<string, Array<ArchivesMonthlyItem>>;
	archivesYears: Array<string>;
	archivesMonths: Record<string, Array<string>>;
}
