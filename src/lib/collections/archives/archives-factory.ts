import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { CatalogCollectionKey, CatalogItem } from '#lib/catalog/catalog-types.ts';
import type {
	ArchivesIndexData,
	ArchivesMonthlyItem,
} from '#lib/collections/archives/archives-types.ts';

import { getDateRanges } from '#lib/utils/date.ts';

interface ArchivesRawMonthData extends Pick<
	ArchivesMonthlyItem,
	'id' | 'year' | 'month' | 'monthName' | 'title'
> {
	created: Set<CatalogItem>;
	updated: Set<CatalogItem>;
	visited: Set<CatalogItem>;
}

type ArchivesDataMap = Map<string, Map<string, ArchivesRawMonthData>>;

interface ArchivesDateData {
	date: Date;
	month: string;
	year: string;
}

interface ArchivesData {
	archivesIndexData: ArchivesIndexData;
	archivesMonthlyData: Array<ArchivesMonthlyItem>;
	archivesYearlyData: Record<string, Array<ArchivesMonthlyItem>>;
	archivesYears: Array<string>;
	archivesMonths: Record<string, Array<string>>;
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
		const monthName = dateData.date.toLocaleDateString('en-US', { month: 'long' });

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

const highlightQualityFloor = 2;
const highlightLimit = 5;

function createHighlightSelector() {
	const seen = new Set<string>();

	return function selectHighlights(items: Array<CatalogItem>): Array<CatalogItem> | undefined {
		const highlights = R.pipe(
			items,
			R.filter(
				(item) =>
					!!item.imageId && item.entryQuality >= highlightQualityFloor && !seen.has(item.id),
			),
			R.sortBy([R.prop('entryQuality'), 'desc'], [R.prop('title'), 'asc']),
			R.take(highlightLimit),
		);

		if (highlights.length === 0) return undefined;

		for (const highlight of highlights) {
			seen.add(highlight.id);
		}

		return highlights;
	};
}

const collectionsExcluded = ['pages'] satisfies Array<CatalogCollectionKey>;

function buildArchivesDataMap(items: ReadonlyArray<CatalogItem>): ArchivesDataMap {
	const archiveDataMap: ArchivesDataMap = new Map();

	for (const item of items) {
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

		if (item.dateRecorded) {
			const yearsRecorded = new Set<string>();
			const recordedDates = getDateRanges(item.dateRecorded)
				.map((range) => range.start.date)
				.sort((a, b) => b.getTime() - a.getTime());

			for (const recordedDate of recordedDates) {
				const recordedDateData = getDateData(recordedDate);

				if (!yearsRecorded.has(recordedDateData.year)) {
					yearsRecorded.add(recordedDateData.year);
					getOrCreateMonthData(archiveDataMap, recordedDateData).visited.add(item);
				}
			}
		}
	}

	return archiveDataMap;
}

// The three categories, as either raw buckets or the projected (filtered, capped, deduped) tier result
interface ArchivesTierBuckets {
	updated: Array<CatalogItem>;
	created: Array<CatalogItem>;
	visited: Array<CatalogItem>;
}

function sortAndLimit(items: Array<CatalogItem>, limit?: number) {
	const sorted = R.sortBy(
		items,
		[R.prop('entryQuality'), 'desc'],
		// Surface entries with a featured image ahead of those without within a given quality tier
		[(item) => (item.imageId ? 1 : 0), 'desc'],
		[R.prop('title'), 'asc'],
	);

	return limit === undefined ? sorted : sorted.slice(0, limit);
}

// Deduplicate across categories within one scope: updated > created > visited
function deduplicateCategories(
	updated: Array<CatalogItem>,
	created: Array<CatalogItem>,
	visited: Array<CatalogItem>,
): ArchivesTierBuckets {
	const updatedIds = new Set(updated.map((item) => item.id));

	const createdFiltered = created.filter((item) => !updatedIds.has(item.id));
	const createdIds = new Set(createdFiltered.map((item) => item.id));

	const visitedFiltered = visited.filter(
		(item) => !updatedIds.has(item.id) && !createdIds.has(item.id),
	);

	return { updated, created: createdFiltered, visited: visitedFiltered };
}

interface ArchivesTierOptions {
	quality: number;
	limit?: number | undefined;
}

const monthlyTierOptions: ArchivesTierOptions = { quality: 1 };
const indexTierOptions: ArchivesTierOptions = { quality: 3, limit: 20 };
const yearlyQualityFloor = 2;
const yearlyLimit = 20;

function projectArchiveTier(
	buckets: ArchivesTierBuckets,
	{ quality, limit }: ArchivesTierOptions,
): ArchivesTierBuckets {
	return deduplicateCategories(
		sortAndLimit(
			buckets.updated.filter((item) => item.entryQuality >= quality),
			limit,
		),
		sortAndLimit(
			buckets.created.filter((item) => item.entryQuality >= quality),
			limit,
		),
		sortAndLimit(
			buckets.visited.filter((item) => item.entryQuality >= quality),
			limit,
		),
	);
}

function tierHasData(tier: ArchivesTierBuckets): boolean {
	return tier.updated.length > 0 || tier.created.length > 0 || tier.visited.length > 0;
}

// Counts reflect the full bucket totals (before the quality floor and cap), unlike the tier lists
function getBucketCounts(buckets: ArchivesTierBuckets) {
	return {
		updatedCount: buckets.updated.length,
		createdCount: buckets.created.length,
		visitedCount: buckets.visited.length,
	};
}

function passesYearlyFloor(item: CatalogItem): boolean {
	return item.entryQuality >= yearlyQualityFloor;
}

// Across a year an entry occupies one category by precedence
// It appears once in the yearly view regardless of month processing order
function getYearlyWinningCategories(
	yearBuckets: ArchivesTierBuckets,
): Map<string, keyof ArchivesTierBuckets> {
	const winning = new Map<string, keyof ArchivesTierBuckets>();

	// Set in reverse precedence so a later write wins: updated overrides created overrides visited
	for (const item of yearBuckets.visited) {
		if (passesYearlyFloor(item)) winning.set(item.id, 'visited');
	}
	for (const item of yearBuckets.created) {
		if (passesYearlyFloor(item)) winning.set(item.id, 'created');
	}
	for (const item of yearBuckets.updated) {
		if (passesYearlyFloor(item)) winning.set(item.id, 'updated');
	}

	return winning;
}

export function createArchivesData(
	items: ReadonlyArray<CatalogItem>,
	archiveEntries: Array<CollectionEntry<'archives'>>,
): ArchivesData {
	const archivesDataMap = buildArchivesDataMap(items);

	const archivesMap = new Map<string, CollectionEntry<'archives'>>();

	for (const entry of archiveEntries) {
		archivesMap.set(entry.id, entry);
	}

	const archivesMonthlyData: ArchivesData['archivesMonthlyData'] = [];
	const archivesYearlyData: ArchivesData['archivesYearlyData'] = {};
	const archivesIndexData: ArchivesData['archivesIndexData'] = {};
	const archivesMonths: Record<string, Array<string>> = {};

	// Index highlights span all years
	// Iterate newest-first so the most recent year keeps a featured image shared across years
	const selectIndexHighlights = createHighlightSelector();

	const yearEntries = [...archivesDataMap].sort(([yearA], [yearB]) => yearB.localeCompare(yearA));

	for (const [year, yearlyData] of yearEntries) {
		const months = [...yearlyData.values()].map((raw) => ({
			raw,
			updated: [...raw.updated],
			created: [...raw.created],
			visited: [...raw.visited],
		}));

		// Monthly view data
		const yearMonthlyItems: Array<ArchivesMonthlyItem> = [];

		for (const month of months) {
			const tier = projectArchiveTier(month, monthlyTierOptions);

			if (!tierHasData(tier)) continue;

			const monthlyItem: ArchivesMonthlyItem = {
				...month.raw,
				highlights: undefined, // Set below
				...getBucketCounts(month),
				...tier,
				archiveEntry: archivesMap.get(month.raw.id),
			};

			archivesMonthlyData.push(monthlyItem);
			yearMonthlyItems.push(monthlyItem);
		}

		archivesMonths[year] = yearMonthlyItems.map((item) => item.month);

		// Monthly highlights; chronological so the earliest month wins a shared featured image
		const selectMonthlyHighlights = createHighlightSelector();

		const sortedMonthlyItems = R.sortBy(yearMonthlyItems, (item) => item.month);

		for (const monthlyItem of sortedMonthlyItems) {
			monthlyItem.highlights = selectMonthlyHighlights([
				...monthlyItem.created,
				...monthlyItem.updated,
				...monthlyItem.visited,
			]);
		}

		// Reuse the monthly highlights in the yearly view
		const monthlyHighlightsById = new Map(
			yearMonthlyItems.filter((item) => item.highlights).map((item) => [item.id, item.highlights]),
		);

		// Aggregate the year's buckets once; reused by the yearly precedence map and the index view
		const yearBuckets: ArchivesTierBuckets = {
			updated: months.flatMap((month) => month.updated),
			created: months.flatMap((month) => month.created),
			visited: months.flatMap((month) => month.visited),
		};

		// Yearly view data; an entry occupies its highest-precedence category for the year
		const yearlyWinningCategory = getYearlyWinningCategories(yearBuckets);

		for (const month of months) {
			const tier: ArchivesTierBuckets = {
				updated: sortAndLimit(
					month.updated.filter((item) => yearlyWinningCategory.get(item.id) === 'updated'),
					yearlyLimit,
				),
				created: sortAndLimit(
					month.created.filter((item) => yearlyWinningCategory.get(item.id) === 'created'),
					yearlyLimit,
				),
				visited: sortAndLimit(
					month.visited.filter((item) => yearlyWinningCategory.get(item.id) === 'visited'),
					yearlyLimit,
				),
			};

			if (!tierHasData(tier)) continue;

			let yearData = archivesYearlyData[year];

			if (!yearData) {
				yearData = [];
				archivesYearlyData[year] = yearData;
			}

			yearData.push({
				...month.raw,
				highlights: monthlyHighlightsById.get(month.raw.id),
				...getBucketCounts(month),
				...tier,
			});
		}

		// Index view; year-level aggregation
		const indexTier = projectArchiveTier(yearBuckets, indexTierOptions);

		if (!tierHasData(indexTier)) continue;

		archivesIndexData[year] = {
			id: year,
			year,
			title: year,
			highlights: selectIndexHighlights([
				...indexTier.created,
				...indexTier.updated,
				...indexTier.visited,
			]),
			...getBucketCounts(yearBuckets),
			...indexTier,
		};
	}

	const archivesYears = Object.keys(archivesYearlyData).sort((a, b) => b.localeCompare(a));
	const yearHasView = new Set(archivesYears);

	return {
		archivesIndexData,
		archivesYearlyData,
		archivesMonthlyData: archivesMonthlyData.filter((item) => yearHasView.has(item.year)),
		archivesYears,
		archivesMonths: Object.fromEntries(
			Object.entries(archivesMonths).filter(([year]) => yearHasView.has(year)),
		),
	};
}
