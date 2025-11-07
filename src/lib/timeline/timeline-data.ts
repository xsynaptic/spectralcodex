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
	month: string;
	year: string;
}

// Standardize date objects for use in the timeline data map
function getDateData(date: Date): TimelineDateData {
	return {
		date,
		month: String(date.getMonth() + 1).padStart(2, '0'),
		year: String(date.getFullYear()).padStart(4, '0'),
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

// Select a highlight for the month
function getMonthlyHighlight(
	monthData: TimelineDataMapMonthlyItem,
): ContentMetadataItem | undefined {
	// Gather all items from the month that have images and meet minimum quality
	const allItems = [
		...monthData.created.values(),
		...monthData.updated.values(),
		...monthData.visited.values(),
	].filter((item) => item.imageId && item.entryQuality >= 2);

	if (allItems.length === 0) return undefined;

	// Group by quality level
	const highlightQualityMap = new Map<number, Array<ContentMetadataItem>>();

	for (const item of allItems) {
		if (!highlightQualityMap.has(item.entryQuality)) {
			highlightQualityMap.set(item.entryQuality, []);
		}
		highlightQualityMap.get(item.entryQuality)!.push(item);
	}

	// Get the highest quality level
	const highestQuality = Math.max(...highlightQualityMap.keys());
	const highlightCandidates = highlightQualityMap.get(highestQuality)!;

	// Randomly select one from the top quality tier
	return highlightCandidates[Math.floor(Math.random() * highlightCandidates.length)];
}

// Generate a map of timeline data from the content metadata index
async function getTimelineDataMap(): Promise<TimelineDataMap> {
	const contentMetadataIndex = await getContentMetadataIndex();

	const timelineDataMap: TimelineDataMap = new Map();

	for (const item of contentMetadataIndex.values()) {
		if (['images', 'pages'].includes(item.collection)) continue;

		const dateUpdatedData = item.dateUpdated ? getDateData(item.dateUpdated) : undefined;
		const dateCreatedData = getDateData(item.dateCreated);

		if (
			dateUpdatedData &&
			dateUpdatedData.year !== dateCreatedData.year &&
			dateUpdatedData.month !== dateCreatedData.month
		) {
			const updatedMonthData = getTimelineMonthData(timelineDataMap, dateUpdatedData);

			updatedMonthData.updated.add(item);
		}

		const createdMonthData = getTimelineMonthData(timelineDataMap, dateCreatedData);

		createdMonthData.created.add(item);

		// Deduplicate multiple visits in the same year
		if (item.dateVisited) {
			const yearsVisited = new Set<string>();

			const dateVisitedArray = item.dateVisited.sort((a, b) => b.getTime() - a.getTime());

			for (const dateVisited of dateVisitedArray) {
				const dateVisitedData = getDateData(dateVisited);
				const visitedMonthData = getTimelineMonthData(timelineDataMap, dateVisitedData);

				if (!yearsVisited.has(dateVisitedData.year)) {
					yearsVisited.add(dateVisitedData.year);
					visitedMonthData.visited.add(item);
				}
			}
		}
	}

	for (const yearlyData of timelineDataMap.values()) {
		for (const monthlyData of yearlyData.values()) {
			// Stash total counts for later reference
			monthlyData.createdCount = monthlyData.created.size;
			monthlyData.updatedCount = monthlyData.updated.size;
			monthlyData.visitedCount = monthlyData.visited.size;

			// Select a highlight item for the month
			monthlyData.highlight = getMonthlyHighlight(monthlyData);
		}
	}

	return timelineDataMap;
}

function aggregateYearlyData(
	yearlyData: Map<string, TimelineDataMapMonthlyItem>,
	category: 'updated' | 'created' | 'visited',
): Array<ContentMetadataItem> {
	return [...yearlyData.values()].flatMap((monthData) => [...monthData[category].values()]);
}

interface TimelineFilterOptions {
	quality: number;
	limit: number;
}

function filterAndSortItems(
	items: Array<ContentMetadataItem>,
	options: TimelineFilterOptions,
): Array<ContentMetadataItem> {
	return items
		.filter((item) => item.entryQuality >= options.quality)
		.sort((a, b) => {
			const qualityDifference = b.entryQuality - a.entryQuality;
			if (qualityDifference !== 0) return qualityDifference;

			return a.title.localeCompare(b.title);
		})
		.slice(0, options.limit);
}

function getTimelineMonthlyData(
	updated: Array<ContentMetadataItem>,
	created: Array<ContentMetadataItem>,
	visited: Array<ContentMetadataItem>,
	options: TimelineFilterOptions,
) {
	const updatedFiltered = filterAndSortItems(updated, options);
	const createdFiltered = filterAndSortItems(created, options);
	const visitedFiltered = filterAndSortItems(visited, options);

	const updatedIds = new Set(updatedFiltered.map((item) => item.id));

	const createdDeduped = createdFiltered.filter((item) => !updatedIds.has(item.id));
	const createdIds = new Set(createdDeduped.map((item) => item.id));

	const visitedDeduped = visitedFiltered.filter(
		(item) => !updatedIds.has(item.id) && !createdIds.has(item.id),
	);

	return {
		updated: updatedFiltered,
		created: createdDeduped,
		visited: visitedDeduped,
		isEmpty:
			updatedFiltered.length === 0 && createdDeduped.length === 0 && visitedDeduped.length === 0,
	};
}

let timelineData: TimelineData | undefined;

// Convert timeline data into the structures consumed by the three timeline pages
export async function getTimelineData(): Promise<TimelineData> {
	if (timelineData) return timelineData;

	const timelineDataMap = await getTimelineDataMap();

	const timelineMonthlyData: TimelineData['timelineMonthlyData'] = [];
	const timelineYearlyData: TimelineData['timelineYearlyData'] = {};
	const timelineIndexData: TimelineData['timelineIndexData'] = {};

	// This tracks the months for each year with data available on the monthly page
	const timelineMonths: Record<string, Array<string>> = {};

	for (const [year, yearlyData] of timelineDataMap.entries()) {
		if (!timelineMonths[year]) timelineMonths[year] = [];

		for (const monthlyData of yearlyData.values()) {
			const monthlyDataProcessed = getTimelineMonthlyData(
				[...monthlyData.updated.values()],
				[...monthlyData.created.values()],
				[...monthlyData.visited.values()],
				{ quality: 1, limit: 40 },
			);
			const yearlyDataProcessed = getTimelineMonthlyData(
				[...monthlyData.updated.values()],
				[...monthlyData.created.values()],
				[...monthlyData.visited.values()],
				{ quality: 2, limit: 20 },
			);

			if (!monthlyDataProcessed.isEmpty) {
				timelineMonthlyData.push({
					...monthlyData,
					created: monthlyDataProcessed.created,
					updated: monthlyDataProcessed.updated,
					visited: monthlyDataProcessed.visited,
				});
				timelineMonths[year].push(monthlyData.month);
			}

			if (!yearlyDataProcessed.isEmpty) {
				if (!timelineYearlyData[year]) timelineYearlyData[year] = [];

				timelineYearlyData[year].push({
					...monthlyData,
					created: yearlyDataProcessed.created,
					updated: yearlyDataProcessed.updated,
					visited: yearlyDataProcessed.visited,
				});
			}
		}

		/**
		 * Timeline index data
		 */
		const updatedAll = aggregateYearlyData(yearlyData, 'updated');
		const createdAll = aggregateYearlyData(yearlyData, 'created');
		const visitedAll = aggregateYearlyData(yearlyData, 'visited');

		const indexDataProcessed = getTimelineMonthlyData(updatedAll, createdAll, visitedAll, {
			quality: 3,
			limit: 12,
		});

		if (indexDataProcessed.isEmpty) continue;

		timelineIndexData[year] = {
			year,
			month: '',
			monthName: '',
			title: year,
			highlight: undefined,
			created: indexDataProcessed.created,
			createdCount: createdAll.length,
			updated: indexDataProcessed.updated,
			updatedCount: updatedAll.length,
			visited: indexDataProcessed.visited,
			visitedCount: visitedAll.length,
		};
	}

	const timelineYears = Object.keys(timelineYearlyData).sort((a, b) => b.localeCompare(a));

	timelineData = {
		timelineIndexData,
		timelineYearlyData,
		timelineMonthlyData,
		timelineYears,
		timelineMonths,
	};

	return timelineData;
}
