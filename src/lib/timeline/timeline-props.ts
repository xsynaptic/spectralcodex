import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';
import type { TimelineMonthlyData, TimelineSpan } from '#lib/timeline/timeline-types.ts';

import { getTimelineMonthlySlug, getTimelineSpan } from '#lib/timeline/timeline-utils.ts';

function getTimelineMonthlyItems(
	timelineItems: Array<ContentMetadataItem>,
): Array<TimelineMonthlyData> {
	const timelineItemsMap = new Map<string, TimelineMonthlyData>();

	if (timelineItems.length > 0) {
		for (const timelineItem of timelineItems) {
			const timelineSlug = getTimelineMonthlySlug(timelineItem.dateCreated);

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
}

export function getTimelineProps({
	timelineSlug,
	timelineSlugs,
	timelineItems,
}: {
	timelineSlug: string;
	timelineSlugs: Array<string>;
	timelineItems: Array<ContentMetadataItem>;
}): {
	title: string;
	dateNavCurrentYear: Array<string>;
	dateNavAllYears: Array<string>;
	timelineSpan: TimelineSpan;
	timelineItems: Array<ContentMetadataItem>;
	timelineMonthlyData?: Array<TimelineMonthlyData>;
} {
	const timelineSpan = getTimelineSpan(timelineSlug);

	const currentDate = new Date(timelineSlug);
	const currentYear = currentDate.getFullYear().toString();

	const timelineProps = {
		dateNavCurrentYear: timelineSlugs.filter((slug) => slug.startsWith(currentYear)).sort(),
		dateNavAllYears: timelineSlugs.filter((slug) => !slug.includes('/')).sort(),
		timelineSpan,
		timelineItems: timelineItems.sort((a, b) => a.dateCreated.getTime() - b.dateCreated.getTime()),
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
}
