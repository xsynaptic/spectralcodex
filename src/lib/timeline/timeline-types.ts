import type { CollectionEntry } from 'astro:content';

import type { ContentMetadataItem } from '#lib/types/index.ts';

/**
 * Timeline
 */
export interface TimelineBaseItem {
	year: string;
	month: string;
	monthName: string;
	title: string; // _e.g._ "January 2025"
	highlights: Array<ContentMetadataItem> | undefined;
	createdCount: number;
	updatedCount: number;
	visitedCount: number;
}

export interface TimelineMonthlyItem extends TimelineBaseItem {
	created: Array<ContentMetadataItem>;
	updated: Array<ContentMetadataItem>;
	visited: Array<ContentMetadataItem>;
	timelineEntry?: CollectionEntry<'timeline'> | undefined;
}

export interface TimelineData {
	timelineIndexData: Record<string, TimelineMonthlyItem>;
	timelineMonthlyData: Array<TimelineMonthlyItem>;
	timelineYearlyData: Record<string, Array<TimelineMonthlyItem>>;
	timelineYears: Array<string>;
	timelineMonths: Record<string, Array<string>>;
}
