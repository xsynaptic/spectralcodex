import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';

import type { ArchivesBaseItem, ArchivesData } from '#lib/collections/archives/archives-types.ts';
import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

interface CollectionData {
	archives: Array<CollectionEntry<'archives'>>;
	archivesMap: Map<string, CollectionEntry<'archives'>>;
}

// TODO: this data handler is non-standard and could use some refactoring
const getArchivesCollection = pMemoize(async (): Promise<CollectionData> => {
	const startTime = performance.now();

	const archives = await getCollection('archives');

	const archivesMap = new Map<string, CollectionEntry<'archives'>>();

	for (const entry of archives) {
		archivesMap.set(entry.id, entry);
	}

	console.log(
		`[Archives] Collection data generated in ${(performance.now() - startTime).toFixed(5)}ms`,
	);

	return { archives, archivesMap };
});

interface ArchivesDataMapMonthlyItem extends ArchivesBaseItem {
	created: Set<ContentMetadataItem>;
	updated: Set<ContentMetadataItem>;
	visited: Set<ContentMetadataItem>;
}

type ArchivesDataMap = Map<string, Map<string, ArchivesDataMapMonthlyItem>>;

interface ArchivesDateData {
	date: Date;
	month: string;
	year: string;
}

// Standardize date objects for use in the archive data map
function getDateData(date: Date): ArchivesDateData {
	return {
		date,
		month: String(date.getMonth() + 1).padStart(2, '0'),
		year: String(date.getFullYear()).padStart(4, '0'),
	};
}

// Get or create the archive data map for a given month
function getArchivesMonthData(archiveDataMap: ArchivesDataMap, dateUpdatedData: ArchivesDateData) {
	if (!archiveDataMap.has(dateUpdatedData.year)) {
		archiveDataMap.set(dateUpdatedData.year, new Map());
	}

	const yearMap = archiveDataMap.get(dateUpdatedData.year)!;

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
// TODO: adapt this function for an entire year's worth of data
function getArchivesHighlights(
	monthData: ArchivesDataMapMonthlyItem,
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

// Generate a map of archive data from the content metadata index
async function getArchivesDataMap(): Promise<ArchivesDataMap> {
	const contentMetadataIndex = await getContentMetadataIndex();

	const archiveDataMap: ArchivesDataMap = new Map();

	for (const item of contentMetadataIndex.values()) {
		if (['images', 'pages'].includes(item.collection)) continue;

		const dateUpdatedData = item.dateUpdated ? getDateData(item.dateUpdated) : undefined;
		const dateCreatedData = getDateData(item.dateCreated);

		if (
			dateUpdatedData &&
			dateUpdatedData.year !== dateCreatedData.year &&
			dateUpdatedData.month !== dateCreatedData.month
		) {
			const updatedMonthData = getArchivesMonthData(archiveDataMap, dateUpdatedData);

			updatedMonthData.updated.add(item);
		}

		const createdMonthData = getArchivesMonthData(archiveDataMap, dateCreatedData);

		createdMonthData.created.add(item);

		// Deduplicate multiple visits in the same year
		if (item.dateVisited) {
			const yearsVisited = new Set<string>();

			const dateVisitedArray = item.dateVisited.sort((a, b) => b.getTime() - a.getTime());

			for (const dateVisited of dateVisitedArray) {
				const dateVisitedData = getDateData(dateVisited);
				const visitedMonthData = getArchivesMonthData(archiveDataMap, dateVisitedData);

				if (!yearsVisited.has(dateVisitedData.year)) {
					yearsVisited.add(dateVisitedData.year);
					visitedMonthData.visited.add(item);
				}
			}
		}
	}

	for (const yearlyData of archiveDataMap.values()) {
		for (const monthlyData of yearlyData.values()) {
			// Stash total counts for later reference
			monthlyData.createdCount = monthlyData.created.size;
			monthlyData.updatedCount = monthlyData.updated.size;
			monthlyData.visitedCount = monthlyData.visited.size;

			// Select a highlight item for the month
			monthlyData.highlights = getArchivesHighlights(monthlyData);
		}
	}

	return archiveDataMap;
}

function getMonthlyDataByYear(
	yearlyData: Map<string, ArchivesDataMapMonthlyItem>,
	category: 'updated' | 'created' | 'visited',
): Array<ContentMetadataItem> {
	return [...yearlyData.values()].flatMap((monthData) => [...monthData[category].values()]);
}

interface ArchivesFilterOptions {
	quality: number;
	limit: number;
}

function filterAndSortItems(
	items: Array<ContentMetadataItem>,
	options: ArchivesFilterOptions,
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

function getArchivesMonthlyData(
	updated: Array<ContentMetadataItem>,
	created: Array<ContentMetadataItem>,
	visited: Array<ContentMetadataItem>,
	options: ArchivesFilterOptions,
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
 * Convert archive data into the structures consumed by the three archive pages
 */
export const getArchivesData = pMemoize(async (): Promise<ArchivesData> => {
	const archivesDataMap = await getArchivesDataMap();

	const { archivesMap } = await getArchivesCollection();

	const archivesMonthlyData: ArchivesData['archivesMonthlyData'] = [];
	const archivesYearlyData: ArchivesData['archivesYearlyData'] = {};
	const archivesIndexData: ArchivesData['archivesIndexData'] = {};

	// This tracks the months for each year with data available on the monthly page
	const archivesMonths: Record<string, Array<string>> = {};

	for (const [year, yearlyData] of archivesDataMap.entries()) {
		if (!archivesMonths[year]) archivesMonths[year] = [];

		// Aggregate all data for the year (used for both yearly and index views)
		const yearUpdatedAll = getMonthlyDataByYear(yearlyData, 'updated');
		const yearCreatedAll = getMonthlyDataByYear(yearlyData, 'created');
		const yearVisitedAll = getMonthlyDataByYear(yearlyData, 'visited');

		// Year-level deduplication for yearly view
		const yearDeduplicated = getArchivesMonthlyData(
			yearUpdatedAll,
			yearCreatedAll,
			yearVisitedAll,
			{ quality: 1, limit: 1000 },
		);

		// Build lookup sets for allowed items per category (for yearly view)
		const allowedUpdated = new Set(yearDeduplicated.updated.map(({ id }) => id));
		const allowedCreated = new Set(yearDeduplicated.created.map(({ id }) => id));
		const allowedVisited = new Set(yearDeduplicated.visited.map(({ id }) => id));

		// Process monthly and yearly views using the allowed sets
		for (const monthlyData of yearlyData.values()) {
			const monthlyDataProcessed = getArchivesMonthlyData(
				[...monthlyData.updated.values()],
				[...monthlyData.created.values()],
				[...monthlyData.visited.values()],
				{ quality: 1, limit: 40 },
			);

			if (!monthlyDataProcessed.isEmpty) {
				// Check for a matching archive collection entry
				// This allows for custom descriptions and images on monthly archive pages
				const archiveEntry = archivesMap.get(`${year}/${year}-${monthlyData.month}`);

				archivesMonthlyData.push({
					...monthlyData,
					created: monthlyDataProcessed.created,
					updated: monthlyDataProcessed.updated,
					visited: monthlyDataProcessed.visited,
					archiveEntry,
				});
				archivesMonths[year].push(monthlyData.month);
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

			if (!archivesYearlyData[year]) archivesYearlyData[year] = [];

			archivesYearlyData[year].push({
				...monthlyData,
				created: yearlyCreatedSorted,
				updated: yearlyUpdatedSorted,
				visited: yearlyVisitedSorted,
			});
		}

		// Archives index data (reuse aggregated year data)
		const indexDataProcessed = getArchivesMonthlyData(
			yearUpdatedAll,
			yearCreatedAll,
			yearVisitedAll,
			{ quality: 3, limit: 20 },
		);

		if (indexDataProcessed.isEmpty) continue;

		archivesIndexData[year] = {
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

	const archivesYears = Object.keys(archivesYearlyData).sort((a, b) => b.localeCompare(a));

	return {
		archivesIndexData,
		archivesYearlyData,
		archivesMonthlyData,
		archivesYears,
		archivesMonths,
	};
});
