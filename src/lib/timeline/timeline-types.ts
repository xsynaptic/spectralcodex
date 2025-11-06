import type { ContentMetadataItem } from '#lib/types/index.ts';

/**
 * Timeline
 */
interface TimelineBaseItem {
	year: string;
	month: string;
	monthName: string;
	title: string; // _e.g._ "January 2025"
	highlight: ContentMetadataItem | undefined;
	postedCount: number;
	createdCount: number;
	updatedCount: number;
	visitedCount: number;
}

export interface TimelineDataMapMonthlyItem extends TimelineBaseItem {
	posted: Set<ContentMetadataItem>;
	created: Set<ContentMetadataItem>;
	updated: Set<ContentMetadataItem>;
	visited: Set<ContentMetadataItem>;
}

export type TimelineDataMap = Map<string, Map<string, TimelineDataMapMonthlyItem>>;

export interface TimelineMonthlyItem extends TimelineBaseItem {
	posted: Array<ContentMetadataItem>;
	created: Array<ContentMetadataItem>;
	updated: Array<ContentMetadataItem>;
	visited: Array<ContentMetadataItem>;
}

export interface TimelineData {
	timelineIndex: Record<string, TimelineMonthlyItem>;
	timelineMonthly: Array<TimelineMonthlyItem>;
	timelineYearly: Record<string, Array<TimelineMonthlyItem>>;
	timelineYears: Array<string>;
}
