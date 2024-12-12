import type { TimelineMonthlyData, TimelineSpan } from '@/lib/timeline/timeline-types';
import type { ContentMetadataItem } from '@/types/metadata';

import { getTimelineMonthlySlug, getTimelineSpan } from '@/lib/timeline/timeline-utils';

const getTimelineMonthlyItems = (timelineItems: ContentMetadataItem[]): TimelineMonthlyData[] => {
	const timelineItemsMap = new Map<string, TimelineMonthlyData>();

	if (timelineItems.length > 0) {
		for (const timelineItem of timelineItems) {
			const timelineSlug = getTimelineMonthlySlug(timelineItem.date);

			if (!timelineItemsMap.has(timelineSlug)) {
				timelineItemsMap.set(timelineSlug, {
					id: timelineSlug,
					date: new Date(timelineSlug),
					title: new Date(timelineSlug).toLocaleDateString('default', {
						month: 'long',
						year: 'numeric',
					}),
					timelineItems: [],
				});
			}
			timelineItemsMap.get(timelineSlug)?.timelineItems.push(timelineItem);
		}
	}
	return [...timelineItemsMap.values()];
};

export const getTimelineProps = ({
	timelineSlug,
	timelineSlugs,
	timelineItems,
}: {
	timelineSlug: string;
	timelineSlugs: string[];
	timelineItems: ContentMetadataItem[];
}): {
	title: string;
	dateNavCurrentYear: string[];
	dateNavAllYears: string[];
	timelineSpan: TimelineSpan;
	timelineItems: ContentMetadataItem[];
	timelineMonthlyData?: TimelineMonthlyData[];
} => {
	const timelineSpan = getTimelineSpan(timelineSlug);

	const currentDate = new Date(timelineSlug);
	const currentYear = currentDate.getFullYear().toString();

	const timelineProps = {
		dateNavCurrentYear: timelineSlugs.filter((slug) => slug.startsWith(currentYear)).sort(),
		dateNavAllYears: timelineSlugs.filter((slug) => !slug.includes('/')).sort(),
		timelineSpan,
		timelineItems: timelineItems.sort((a, b) => a.date.getTime() - b.date.getTime()),
	};

	switch (timelineSpan) {
		case 'day': {
			return {
				title: currentDate.toLocaleDateString('default', {
					month: 'long',
					day: 'numeric',
					year: 'numeric',
				}),
				...timelineProps,
			};
		}
		case 'month': {
			return {
				title: currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
				...timelineProps,
			};
		}
		default: {
			return {
				title: currentYear,
				timelineMonthlyData: getTimelineMonthlyItems(timelineItems).sort(
					(a, b) => a.date.getTime() - b.date.getTime(),
				),
				...timelineProps,
			};
		}
	}
};
