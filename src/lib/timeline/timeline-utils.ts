import { getTimelineDataMap } from '#lib/timeline/timeline-data.ts';

// Dynamically fetch the latest year from the timeline items map
// This is used to populate the menu header
export async function getTimelineLatestYear() {
	const timelineItemsMap = await getTimelineDataMap();

	const latestYear = [...timelineItemsMap.keys()].sort((a, b) => Number(b) - Number(a))[0];

	return latestYear;
}
