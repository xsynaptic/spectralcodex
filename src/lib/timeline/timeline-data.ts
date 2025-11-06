import type { TimelineBaseItem, TimelineData } from '#lib/timeline/timeline-types.ts';
import type { ContentMetadataItem } from '#lib/types/index.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

interface TimelineDataMapMonthlyItem extends TimelineBaseItem {
	created: Set<ContentMetadataItem>;
	updated: Set<ContentMetadataItem>;
	visited: Set<ContentMetadataItem>;
}

type TimelineDataMap = Map<string, Map<string, TimelineDataMapMonthlyItem>>;

interface TimelineDateData {
	date: Date;
	slug: string;
	month: string;
	year: string;
}

// Standardize date objects for use in the timeline data map
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

// Get or create the timeline data map for a given month
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

// Generate a map of timeline data from the content metadata index
async function getTimelineDataMap(): Promise<TimelineDataMap> {
	const contentMetadataIndex = await getContentMetadataIndex();

	const timelineDataMap: TimelineDataMap = new Map();

	for (const item of contentMetadataIndex.values()) {
		if (['images', 'pages'].includes(item.collection)) continue;

		const dateUpdatedData = item.dateUpdated ? getDateData(item.dateUpdated) : undefined;
		const dateCreatedData = getDateData(item.dateCreated);

		if (dateUpdatedData && dateUpdatedData.slug !== dateCreatedData.slug) {
			const updatedMonthData = getTimelineMonthData(timelineDataMap, dateUpdatedData);

			updatedMonthData.updated.add(item);
		}

		const createdMonthData = getTimelineMonthData(timelineDataMap, dateCreatedData);

		createdMonthData.created.add(item);

		// Deduplicate multiple visits in the same year
		if (item.dateVisited) {
			const yearsVisited = new Set<string>();

			const dateVisitedData = item.dateVisited.sort((a, b) => b.getTime() - a.getTime());

			for (const dateVisited of dateVisitedData) {
				const dateVisitedData = getDateData(dateVisited);
				const visitedMonthData = getTimelineMonthData(timelineDataMap, dateVisitedData);

				if (!yearsVisited.has(dateVisitedData.year)) {
					yearsVisited.add(dateVisitedData.year);
					visitedMonthData.visited.add(item);
				}
			}
			yearsVisited.clear();
		}
	}

	for (const year of timelineDataMap.keys()) {
		for (const month of timelineDataMap.get(year)!.keys()) {
			const monthData = timelineDataMap.get(year)!.get(month)!;

			// Stash total counts for later reference
			monthData.createdCount = monthData.created.size;
			monthData.updatedCount = monthData.updated.size;
			monthData.visitedCount = monthData.visited.size;

			// TODO: cycle through timelineItemsMap by year and month and assign a highlight item if any items qualify
		}
	}

	return timelineDataMap;
}

function filterAndSortItems(
	items: Array<ContentMetadataItem>,
	qualityThreshold: number,
	limit: number,
): Array<ContentMetadataItem> {
	return items
		.filter((item) => item.entryQuality >= qualityThreshold)
		.sort((a, b) => {
			const qualityDifference = b.entryQuality - a.entryQuality;
			if (qualityDifference !== 0) return qualityDifference;

			return a.title.localeCompare(b.title);
		})
		.slice(0, limit);
}

// Convert timeline data into the structures consumed by the three timeline pages
export async function getTimelineData(): Promise<TimelineData> {
	const timelineDataMap = await getTimelineDataMap();

	const timelineMonthlyData: TimelineData['timelineMonthlyData'] = [];
	const timelineYearlyData: TimelineData['timelineYearlyData'] = {};
	const timelineIndexData: TimelineData['timelineIndexData'] = {};

	for (const [year, yearlyData] of timelineDataMap.entries()) {
		/**
		 * Timeline monthly data
		 */
		for (const monthlyData of yearlyData.values()) {
			const updated = filterAndSortItems([...monthlyData.updated.values()], 1, 40);
			const created = filterAndSortItems([...monthlyData.created.values()], 1, 40);
			const visited = filterAndSortItems([...monthlyData.visited.values()], 1, 40);

			if (updated.length === 0 && created.length === 0 && visited.length === 0) continue;

			timelineMonthlyData.push({
				...monthlyData,
				created,
				updated,
				visited,
			});
		}

		/**
		 * Timeline yearly data
		 */
		for (const monthlyData of yearlyData.values()) {
			const updated = filterAndSortItems([...monthlyData.updated.values()], 2, 20);
			const created = filterAndSortItems([...monthlyData.created.values()], 2, 20);
			const visited = filterAndSortItems([...monthlyData.visited.values()], 2, 20);

			if (updated.length === 0 && created.length === 0 && visited.length === 0) continue;

			if (!timelineYearlyData[year]) timelineYearlyData[year] = [];

			timelineYearlyData[year].push({
				...monthlyData,
				created,
				updated,
				visited,
			});
		}

		/**
		 * Timeline index data
		 */
		const allUpdated = [...yearlyData.values()]
			.map((item) => [...item.updated.values()])
			.filter((item) => item.length > 0)
			.flat();
		const allCreated = [...yearlyData.values()]
			.map((item) => [...item.created.values()])
			.filter((item) => item.length > 0)
			.flat();
		const allVisited = [...yearlyData.values()]
			.map((item) => [...item.visited.values()])
			.filter((item) => item.length > 0)
			.flat();

		const updated = filterAndSortItems(allUpdated, 3, 12);
		const created = filterAndSortItems(allCreated, 3, 12);
		const visited = filterAndSortItems(allVisited, 3, 12);

		if (updated.length === 0 && created.length === 0 && visited.length === 0) continue;

		timelineIndexData[year] = {
			year,
			month: '',
			monthName: '',
			title: year,
			highlight: undefined,
			created,
			createdCount: allCreated.length,
			updated,
			updatedCount: allUpdated.length,
			visited,
			visitedCount: allVisited.length,
		};
	}

	const timelineYears = Object.keys(timelineYearlyData).sort((a, b) => b.localeCompare(a));

	return {
		timelineIndexData,
		timelineYearlyData,
		timelineMonthlyData,
		timelineYears,
	};
}
