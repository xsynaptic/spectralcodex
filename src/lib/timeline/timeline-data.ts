import type { TimelineData, TimelineDataMap } from '#lib/timeline/timeline-types.ts';

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

function getTimelineMonthData(timelineDataMap: TimelineDataMap, dateUpdatedData: TimelineDateData) {
	if (!timelineDataMap.has(dateUpdatedData.year)) {
		timelineDataMap.set(dateUpdatedData.year, new Map());
	}

	const yearMap = timelineDataMap.get(dateUpdatedData.year)!;

	if (!yearMap.has(dateUpdatedData.month)) {
		const monthName = dateUpdatedData.date.toLocaleDateString('default', { month: 'long' });

		yearMap.set(dateUpdatedData.month, {
			year: dateUpdatedData.year,
			month: dateUpdatedData.month,
			monthName,
			title: `${monthName} ${dateUpdatedData.year}`,
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

const timelineDataMap: TimelineDataMap = new Map();

export async function getTimelineDataMap() {
	if (timelineDataMap.size > 0) {
		return timelineDataMap;
	}

	const contentMetadataIndex = await getContentMetadataIndex();

	for (const item of contentMetadataIndex.values()) {
		const dateUpdatedData = item.dateUpdated ? getDateData(item.dateUpdated) : undefined;
		const dateCreatedData = getDateData(item.dateCreated);

		if (dateUpdatedData && dateUpdatedData.slug !== dateCreatedData.slug) {
			const updatedMonthData = getTimelineMonthData(timelineDataMap, dateUpdatedData);

			updatedMonthData.updated.add(item);
		}

		const createdMonthData = getTimelineMonthData(timelineDataMap, dateCreatedData);

		createdMonthData.created.add(item);

		// TODO: deduplicate multiple visits in the same month
		if (item.dateVisited) {
			for (const dateVisited of item.dateVisited) {
				const dateVisitedData = getDateData(dateVisited);
				const visitedMonthData = getTimelineMonthData(timelineDataMap, dateVisitedData);

				visitedMonthData.visited.add(item);
			}
		}
	}

	for (const year of timelineDataMap.keys()) {
		for (const month of timelineDataMap.get(year)!.keys()) {
			const monthData = timelineDataMap.get(year)!.get(month)!;

			monthData.postedCount = monthData.posted.size;
			monthData.createdCount = monthData.created.size;
			monthData.updatedCount = monthData.updated.size;
			monthData.visitedCount = monthData.visited.size;

			// TODO: cycle through timelineItemsMap by year and month and assign a highlight item if any items qualify
		}
	}

	return timelineDataMap;
}

export async function getTimelineData(): Promise<TimelineData> {
	const timelineDataMap = await getTimelineDataMap();

	const timelineYears = [...timelineDataMap.keys()].sort((a, b) => Number(b) - Number(a));

	const timelineMonthly: TimelineData['timelineMonthly'] = [];
	const timelineYearly: TimelineData['timelineYearly'] = {};
	const timelineIndex: TimelineData['timelineIndex'] = {};

	for (const [year, yearlyData] of timelineDataMap.entries()) {
		for (const [, monthlyData] of yearlyData.entries()) {
			const updated = [...monthlyData.updated.values()].filter((item) => item.entryQuality > 1);
			const created = [...monthlyData.created.values()].filter((item) => item.entryQuality > 1);
			const visited = [...monthlyData.visited.values()].filter((item) => item.entryQuality > 1);

			if (updated.length === 0 && created.length === 0 && visited.length === 0) continue;

			timelineMonthly.push({
				...monthlyData,
				posted: [...monthlyData.posted.values()],
				created,
				updated,
				visited,
			});
		}

		for (const [, monthlyData] of yearlyData.entries()) {
			const updated = [...monthlyData.updated.values()].filter((item) => item.entryQuality > 2);
			const created = [...monthlyData.created.values()].filter((item) => item.entryQuality > 2);
			const visited = [...monthlyData.visited.values()].filter((item) => item.entryQuality > 2);

			if (updated.length === 0 && created.length === 0 && visited.length === 0) continue;

			if (!timelineYearly[year]) timelineYearly[year] = [];

			timelineYearly[year].push({
				...monthlyData,
				posted: [...monthlyData.posted.values()],
				created,
				updated,
				visited,
			});
		}

		for (const [, monthlyData] of yearlyData.entries()) {
			const updated = [...monthlyData.updated.values()].filter((item) => item.entryQuality > 3);
			const created = [...monthlyData.created.values()].filter((item) => item.entryQuality > 3);
			const visited = [...monthlyData.visited.values()].filter((item) => item.entryQuality > 3);

			if (updated.length === 0 && created.length === 0 && visited.length === 0) continue;

			// TODO: add to timelineIndex; currently this only sets the last value
			timelineIndex[year] = {
				...monthlyData,
				posted: [...monthlyData.posted.values()],
				created,
				updated,
				visited,
			};
		}
	}

	return {
		timelineIndex,
		timelineYearly,
		timelineMonthly,
		timelineYears,
	};
}
