import type { ContentMetadataItem } from '@/types/metadata';

export type TimelineSpan = 'day' | 'month' | 'year';

export interface TimelineMonthlyData {
	id: string;
	date: Date;
	title: string;
	timelineItems: ContentMetadataItem[];
}

export interface TimelineYearlyData {
	id: string;
	date: Date;
	title: string;
}
