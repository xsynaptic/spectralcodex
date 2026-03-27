import type { CollectionEntry } from 'astro:content';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

export interface ArchivesMonthlyItem {
	id: string;
	title: string;
	year: string;
	month: string;
	monthName: string;
	highlights: Array<ContentMetadataItem> | undefined;
	createdCount: number;
	updatedCount: number;
	visitedCount: number;
	created: Array<ContentMetadataItem>;
	updated: Array<ContentMetadataItem>;
	visited: Array<ContentMetadataItem>;
	archiveEntry?: CollectionEntry<'archives'> | undefined;
}

export type ArchivesIndexData = Record<string, ArchivesMonthlyItem>;
