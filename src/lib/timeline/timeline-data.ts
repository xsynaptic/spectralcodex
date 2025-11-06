import type { TimelineDataMap } from '#lib/types/index.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

interface TimelineDateData {
	date: Date;
	slug: string;
	month: string;
	year: string;
}

function getDateData(date: Date): TimelineDateData {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const year = String(date.getFullYear()).padStart(4, '0');

	return {
		date,
		slug: `${year}/${month}`,
		month,
		year,
	};
}

function getTimelineMonthData(
	timelineItemsMap: TimelineDataMap,
	dateUpdatedData: TimelineDateData,
) {
	if (!timelineItemsMap.has(dateUpdatedData.year)) {
		timelineItemsMap.set(dateUpdatedData.year, new Map());
	}

	const yearMap = timelineItemsMap.get(dateUpdatedData.year)!;

	if (!yearMap.has(dateUpdatedData.month)) {
		yearMap.set(dateUpdatedData.month, {
			title: dateUpdatedData.date.toLocaleDateString('default', { month: 'long' }),
			highlight: undefined,
			posted: new Set(),
			postedCount: 0,
			created: new Set(),
			createdCount: 0,
			updated: new Set(),
			updatedCount: 0,
			visited: new Set(),
			visitedCount: 0,
		});
	}

	return yearMap.get(dateUpdatedData.month)!;
}

const timelineItemsMap: TimelineDataMap = new Map();

export async function getTimelineDataMap() {
	if (timelineItemsMap.size > 0) {
		return timelineItemsMap;
	}

	const contentMetadataIndex = await getContentMetadataIndex();

	for (const item of contentMetadataIndex.values()) {
		const dateUpdatedData = item.dateUpdated ? getDateData(item.dateUpdated) : undefined;
		const dateCreatedData = getDateData(item.dateCreated);

		if (dateUpdatedData && dateUpdatedData.slug !== dateCreatedData.slug) {
			const updatedMonthData = getTimelineMonthData(timelineItemsMap, dateUpdatedData);

			updatedMonthData.updated.add(item);
		}

		const createdMonthData = getTimelineMonthData(timelineItemsMap, dateCreatedData);

		createdMonthData.created.add(item);

		// TODO: deduplicate multiple visits in the same month
		if (item.dateVisited) {
			for (const dateVisited of item.dateVisited) {
				const dateVisitedData = getDateData(dateVisited);
				const visitedMonthData = getTimelineMonthData(timelineItemsMap, dateVisitedData);

				visitedMonthData.visited.add(item);
			}
		}
	}

	for (const year of timelineItemsMap.keys()) {
		for (const month of timelineItemsMap.get(year)!.keys()) {
			const monthData = timelineItemsMap.get(year)!.get(month)!;

			monthData.postedCount = monthData.posted.size;
			monthData.createdCount = monthData.created.size;
			monthData.updatedCount = monthData.updated.size;
			monthData.visitedCount = monthData.visited.size;

			// TODO: cycle through timelineItemsMap by year and month and assign a highlight item if any items qualify
		}
	}

	return timelineItemsMap;
}
