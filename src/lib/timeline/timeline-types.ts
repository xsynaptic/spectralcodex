import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

export type TimelineSpan = 'day' | 'month' | 'year';

export interface TimelineMonthlyData {
	id: string;
	date: Date;
	title: string;
	timelineItems: Array<ContentMetadataItem>;
}

export interface TimelineYearlyData {
	id: string;
	date: Date;
	title: string;
}
