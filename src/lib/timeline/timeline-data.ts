import pMemoize from 'p-memoize';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';
import type { TimelineBaseItem, TimelineData } from '#lib/timeline/timeline-types.ts';

import { getTimelineCollection } from '#lib/collections/timeline/data.ts';
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
			highlights: undefined,
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
function getMonthlyHighlights(
	monthData: TimelineDataMapMonthlyItem,
): Array<ContentMetadataItem> | undefined {
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
	const highlightCandidates = highlightQualityMap.get(highestQuality);

	return highlightCandidates ? highlightCandidates.slice(0, 5) : undefined;
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
			monthlyData.highlights = getMonthlyHighlights(monthlyData);
		}
	}

	return timelineDataMap;
}

function getMonthlyDataByYear(
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

/**
 * Convert timeline data into the structures consumed by the three timeline pages
 */
export const getTimelineData = pMemoize(async (): Promise<TimelineData> => {
	const timelineDataMap = await getTimelineDataMap();

	const { timelineEntriesMap } = await getTimelineCollection();

	const timelineMonthlyData: TimelineData['timelineMonthlyData'] = [];
	const timelineYearlyData: TimelineData['timelineYearlyData'] = {};
	const timelineIndexData: TimelineData['timelineIndexData'] = {};

	// This tracks the months for each year with data available on the monthly page
	const timelineMonths: Record<string, Array<string>> = {};

	for (const [year, yearlyData] of timelineDataMap.entries()) {
		if (!timelineMonths[year]) timelineMonths[year] = [];

		// Aggregate all data for the year (used for both yearly and index views)
		const yearUpdatedAll = getMonthlyDataByYear(yearlyData, 'updated');
		const yearCreatedAll = getMonthlyDataByYear(yearlyData, 'created');
		const yearVisitedAll = getMonthlyDataByYear(yearlyData, 'visited');

		// Year-level deduplication for yearly view
		const yearDeduplicated = getTimelineMonthlyData(
			yearUpdatedAll,
			yearCreatedAll,
			yearVisitedAll,
			{ quality: 1, limit: 1000 },
		);

		// Build lookup sets for allowed items per category (for yearly view)
		const allowedUpdated = new Set(yearDeduplicated.updated.map((i) => i.id));
		const allowedCreated = new Set(yearDeduplicated.created.map((i) => i.id));
		const allowedVisited = new Set(yearDeduplicated.visited.map((i) => i.id));

		// Process monthly and yearly views using the allowed sets
		for (const monthlyData of yearlyData.values()) {
			const monthlyDataProcessed = getTimelineMonthlyData(
				[...monthlyData.updated.values()],
				[...monthlyData.created.values()],
				[...monthlyData.visited.values()],
				{ quality: 1, limit: 40 },
			);

			if (!monthlyDataProcessed.isEmpty) {
				// Check for a matching timeline collection entry
				// This allows for custom descriptions and images on monthly timeline pages
				const timelineEntry = timelineEntriesMap.get(`${year}/${year}-${monthlyData.month}`);

				timelineMonthlyData.push({
					...monthlyData,
					created: monthlyDataProcessed.created,
					updated: monthlyDataProcessed.updated,
					visited: monthlyDataProcessed.visited,
					timelineEntry,
				});
				timelineMonths[year].push(monthlyData.month);
			}

			// Yearly view; filter by allowed sets AND quality threshold
			const yearlyUpdated = [...monthlyData.updated.values()].filter(
				(item) => item.entryQuality >= 2 && allowedUpdated.has(item.id),
			);
			const yearlyCreated = [...monthlyData.created.values()].filter(
				(item) => item.entryQuality >= 2 && allowedCreated.has(item.id),
			);
			const yearlyVisited = [...monthlyData.visited.values()].filter(
				(item) => item.entryQuality >= 2 && allowedVisited.has(item.id),
			);

			// Sort by quality and limit per month
			const yearlyUpdatedSorted = filterAndSortItems(yearlyUpdated, { quality: 0, limit: 20 });
			const yearlyCreatedSorted = filterAndSortItems(yearlyCreated, { quality: 0, limit: 20 });
			const yearlyVisitedSorted = filterAndSortItems(yearlyVisited, { quality: 0, limit: 20 });

			if (
				yearlyUpdatedSorted.length === 0 &&
				yearlyCreatedSorted.length === 0 &&
				yearlyVisitedSorted.length === 0
			)
				continue;

			if (!timelineYearlyData[year]) timelineYearlyData[year] = [];

			timelineYearlyData[year].push({
				...monthlyData,
				created: yearlyCreatedSorted,
				updated: yearlyUpdatedSorted,
				visited: yearlyVisitedSorted,
			});
		}

		// Timeline index data (reuse aggregated year data)
		const indexDataProcessed = getTimelineMonthlyData(
			yearUpdatedAll,
			yearCreatedAll,
			yearVisitedAll,
			{ quality: 3, limit: 20 },
		);

		if (indexDataProcessed.isEmpty) continue;

		timelineIndexData[year] = {
			year,
			month: '',
			monthName: '',
			title: year,
			highlights: undefined,
			created: indexDataProcessed.created,
			createdCount: yearCreatedAll.length,
			updated: indexDataProcessed.updated,
			updatedCount: yearUpdatedAll.length,
			visited: indexDataProcessed.visited,
			visitedCount: yearVisitedAll.length,
		};
	}

	const timelineYears = Object.keys(timelineYearlyData).sort((a, b) => b.localeCompare(a));

	return {
		timelineIndexData,
		timelineYearlyData,
		timelineMonthlyData,
		timelineYears,
		timelineMonths,
	};
});
