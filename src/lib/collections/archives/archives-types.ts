import type { CollectionEntry } from 'astro:content';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

// Fields shared by both archive views
// A year summary (index view) carries exactly these; a monthly item adds the month-specific fields below
interface ArchivesYearSummary {
	id: string;
	title: string;
	year: string;
	highlights: Array<ContentMetadataItem> | undefined;
	createdCount: number;
	updatedCount: number;
	visitedCount: number;
	created: Array<ContentMetadataItem>;
	updated: Array<ContentMetadataItem>;
	visited: Array<ContentMetadataItem>;
}

export interface ArchivesMonthlyItem extends ArchivesYearSummary {
	month: string;
	monthName: string;
	archiveEntry?: CollectionEntry<'archives'> | undefined;
}

export type ArchivesIndexData = Record<string, ArchivesYearSummary>;
