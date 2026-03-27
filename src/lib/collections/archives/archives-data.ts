import type { CollectionEntry } from 'astro:content';

import { getCollection } from 'astro:content';
import { performance } from 'node:perf_hooks';
import pMemoize from 'p-memoize';
import * as R from 'remeda';

import type {
	ArchivesIndexData,
	ArchivesMonthlyItem,
} from '#lib/collections/archives/archives-types.ts';
import type {
	ContentMetadataCollectionKey,
	ContentMetadataItem,
} from '#lib/metadata/metadata-types.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

const getArchivesCollection = pMemoize(async () => {
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

interface ArchivesRawMonthData extends Pick<
	ArchivesMonthlyItem,
	'id' | 'year' | 'month' | 'monthName' | 'title'
> {
	created: Set<ContentMetadataItem>;
	updated: Set<ContentMetadataItem>;
	visited: Set<ContentMetadataItem>;
}

type ArchivesDataMap = Map<string, Map<string, ArchivesRawMonthData>>;

interface ArchivesDateData {
	date: Date;
	month: string;
	year: string;
}

function getDateData(date: Date): ArchivesDateData {
	return {
		date,
		month: String(date.getMonth() + 1).padStart(2, '0'),
		year: String(date.getFullYear()).padStart(4, '0'),
	};
}

function getOrCreateMonthData(archiveDataMap: ArchivesDataMap, dateData: ArchivesDateData) {
	if (!archiveDataMap.has(dateData.year)) {
		archiveDataMap.set(dateData.year, new Map());
	}

	const yearMap = archiveDataMap.get(dateData.year)!;

	if (!yearMap.has(dateData.month)) {
		const monthName = dateData.date.toLocaleDateString('default', { month: 'long' });

		yearMap.set(dateData.month, {
			id: `${dateData.year}/${dateData.month}`,
			year: dateData.year,
			month: dateData.month,
			monthName,
			title: `${monthName} ${dateData.year}`,
			created: new Set(),
			updated: new Set(),
			visited: new Set(),
		});
	}

	return yearMap.get(dateData.month)!;
}

// Select highlights from candidates, preferring higher quality but drawing from all tiers
function getArchivesHighlights(
	items: Array<ContentMetadataItem>,
): Array<ContentMetadataItem> | undefined {
	if (items.length === 0) return undefined;

	const sorted = R.pipe(
		items,
		R.sortBy([R.prop('entryQuality'), 'desc'], [R.prop('title'), 'asc']),
		R.take(5),
	);

	return sorted.length > 0 ? sorted : undefined;
}

const collectionsExcluded = ['pages'] satisfies Array<ContentMetadataCollectionKey>;

async function buildArchivesDataMap(): Promise<ArchivesDataMap> {
	const contentMetadataIndex = await getContentMetadataIndex();

	const archiveDataMap: ArchivesDataMap = new Map();

	for (const item of contentMetadataIndex.values()) {
		if (R.isIncludedIn(item.collection, collectionsExcluded)) continue;

		const dateCreatedData = getDateData(item.dateCreated);
		const dateUpdatedData = item.dateUpdated ? getDateData(item.dateUpdated) : undefined;

		if (
			dateUpdatedData &&
			(dateUpdatedData.year !== dateCreatedData.year ||
				dateUpdatedData.month !== dateCreatedData.month)
		) {
			getOrCreateMonthData(archiveDataMap, dateUpdatedData).updated.add(item);
		}

		getOrCreateMonthData(archiveDataMap, dateCreatedData).created.add(item);

		if (item.dateVisited) {
			const yearsVisited = new Set<string>();
			const dateVisitedArray = item.dateVisited.sort((a, b) => b.getTime() - a.getTime());

			for (const dateVisited of dateVisitedArray) {
				const dateVisitedData = getDateData(dateVisited);

				if (!yearsVisited.has(dateVisitedData.year)) {
					yearsVisited.add(dateVisitedData.year);
					getOrCreateMonthData(archiveDataMap, dateVisitedData).visited.add(item);
				}
			}
		}
	}

	return archiveDataMap;
}

function sortAndLimit(items: Array<ContentMetadataItem>, limit: number) {
	return R.pipe(
		items,
		R.sortBy([R.prop('entryQuality'), 'desc'], [R.prop('title'), 'asc']),
		R.take(limit),
	);
}

// Deduplicate across categories: updated > created > visited
function deduplicateCategories(
	updated: Array<ContentMetadataItem>,
	created: Array<ContentMetadataItem>,
	visited: Array<ContentMetadataItem>,
	excludeIds?: Set<string>,
) {
	const exclude = excludeIds ?? new Set<string>();

	const updatedFiltered = updated.filter((item) => !exclude.has(item.id));
	const updatedIds = new Set(updatedFiltered.map((item) => item.id));

	const createdFiltered = created.filter(
		(item) => !exclude.has(item.id) && !updatedIds.has(item.id),
	);
	const createdIds = new Set(createdFiltered.map((item) => item.id));

	const visitedFiltered = visited.filter(
		(item) => !exclude.has(item.id) && !updatedIds.has(item.id) && !createdIds.has(item.id),
	);

	return { updated: updatedFiltered, created: createdFiltered, visited: visitedFiltered };
}

interface ArchivesData {
	archivesIndexData: ArchivesIndexData;
	archivesMonthlyData: Array<ArchivesMonthlyItem>;
	archivesYearlyData: Record<string, Array<ArchivesMonthlyItem>>;
	archivesYears: Array<string>;
	archivesMonths: Record<string, Array<string>>;
}

export const getArchivesData = pMemoize(async (): Promise<ArchivesData> => {
	const archivesDataMap = await buildArchivesDataMap();
	const { archivesMap } = await getArchivesCollection();

	const archivesMonthlyData: ArchivesData['archivesMonthlyData'] = [];
	const archivesYearlyData: ArchivesData['archivesYearlyData'] = {};
	const archivesIndexData: ArchivesData['archivesIndexData'] = {};
	const archivesMonths: Record<string, Array<string>> = {};

	const indexHighlightIds = new Set<string>();

	for (const [year, yearlyData] of archivesDataMap.entries()) {
		archivesMonths[year] = [];

		// Convert Sets to Arrays once per month
		const months = [...yearlyData.values()].map((raw) => ({
			raw,
			updated: [...raw.updated],
			created: [...raw.created],
			visited: [...raw.visited],
		}));

		// Monthly view data
		for (const month of months) {
			const deduped = deduplicateCategories(
				sortAndLimit(
					month.updated.filter((item) => item.entryQuality >= 1),
					40,
				),
				sortAndLimit(
					month.created.filter((item) => item.entryQuality >= 1),
					40,
				),
				sortAndLimit(
					month.visited.filter((item) => item.entryQuality >= 1),
					40,
				),
			);

			const hasData =
				deduped.updated.length > 0 || deduped.created.length > 0 || deduped.visited.length > 0;

			if (hasData) {
				archivesMonthlyData.push({
					...month.raw,
					highlights: undefined, // Set below
					createdCount: month.created.length,
					updatedCount: month.updated.length,
					visitedCount: month.visited.length,
					created: deduped.created,
					updated: deduped.updated,
					visited: deduped.visited,
					archiveEntry: archivesMap.get(month.raw.id),
				});
				archivesMonths[year].push(month.raw.month);
			}
		}

		// Monthly highlights; don't repeat within a year
		const yearHighlightIds = new Set<string>();

		for (const monthlyItem of archivesMonthlyData.filter((entry) => entry.year === year)) {
			const candidates = [...monthlyItem.created, ...monthlyItem.updated, ...monthlyItem.visited]
				.filter((item) => item.imageId && item.entryQuality >= 2)
				.filter((item) => !yearHighlightIds.has(item.id));

			const highlights = getArchivesHighlights(candidates);

			if (highlights) {
				monthlyItem.highlights = highlights;

				for (const highlight of highlights) {
					yearHighlightIds.add(highlight.id);
				}
			}
		}

		// Build a lookup for monthly highlights to reuse in the yearly view
		const monthlyHighlightsById = new Map(
			archivesMonthlyData
				.filter((entry) => entry.year === year && entry.highlights)
				.map((entry) => [entry.id, entry.highlights]),
		);

		// Yearly view data; running deduplication across months
		const yearlySeenIds = new Set<string>();

		for (const month of months) {
			const deduped = deduplicateCategories(
				sortAndLimit(
					month.updated.filter((item) => item.entryQuality >= 2),
					20,
				),
				sortAndLimit(
					month.created.filter((item) => item.entryQuality >= 2),
					20,
				),
				sortAndLimit(
					month.visited.filter((item) => item.entryQuality >= 2),
					20,
				),
				yearlySeenIds,
			);

			const hasData =
				deduped.updated.length > 0 || deduped.created.length > 0 || deduped.visited.length > 0;

			if (!hasData) continue;

			for (const item of [...deduped.updated, ...deduped.created, ...deduped.visited]) {
				yearlySeenIds.add(item.id);
			}

			if (!archivesYearlyData[year]) archivesYearlyData[year] = [];

			archivesYearlyData[year].push({
				...month.raw,
				highlights: monthlyHighlightsById.get(month.raw.id),
				createdCount: month.created.length,
				updatedCount: month.updated.length,
				visitedCount: month.visited.length,
				created: deduped.created,
				updated: deduped.updated,
				visited: deduped.visited,
			});
		}

		// Index view; year-level aggregation
		const yearUpdated = months.flatMap((month) => month.updated);
		const yearCreated = months.flatMap((month) => month.created);
		const yearVisited = months.flatMap((month) => month.visited);

		const indexDeduped = deduplicateCategories(
			sortAndLimit(
				yearUpdated.filter((item) => item.entryQuality >= 3),
				20,
			),
			sortAndLimit(
				yearCreated.filter((item) => item.entryQuality >= 3),
				20,
			),
			sortAndLimit(
				yearVisited.filter((item) => item.entryQuality >= 3),
				20,
			),
		);

		const hasIndexData =
			indexDeduped.updated.length > 0 ||
			indexDeduped.created.length > 0 ||
			indexDeduped.visited.length > 0;

		if (!hasIndexData) continue;

		const indexHighlightCandidates = [
			...indexDeduped.created,
			...indexDeduped.updated,
			...indexDeduped.visited,
		]
			.filter((item) => item.imageId && item.entryQuality >= 2)
			.filter((item) => !indexHighlightIds.has(item.id));

		const indexHighlights = getArchivesHighlights(indexHighlightCandidates);

		if (indexHighlights) {
			for (const highlight of indexHighlights) {
				indexHighlightIds.add(highlight.id);
			}
		}

		archivesIndexData[year] = {
			id: year,
			year,
			month: '',
			monthName: '',
			title: year,
			highlights: indexHighlights,
			created: indexDeduped.created,
			createdCount: yearCreated.length,
			updated: indexDeduped.updated,
			updatedCount: yearUpdated.length,
			visited: indexDeduped.visited,
			visitedCount: yearVisited.length,
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
