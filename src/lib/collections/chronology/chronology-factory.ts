import type { CollectionEntry } from 'astro:content';

import * as R from 'remeda';

import type { CatalogCollectionKey, CatalogItem } from '#lib/catalog/catalog-types.ts';
import type {
	ChronologyDailyCounts,
	ChronologyDailyData,
	ChronologyIndexData,
	ChronologyMonthlyItem,
} from '#lib/collections/chronology/chronology-types.ts';

import { millisecondsPerDay } from '#constants.ts';
import { getDateRanges, getDayKey } from '#lib/utils/date.ts';

interface ChronologyRawMonthData extends Pick<
	ChronologyMonthlyItem,
	'id' | 'year' | 'month' | 'monthName' | 'title'
> {
	created: Set<CatalogItem>;
	updated: Set<CatalogItem>;
	visited: Set<CatalogItem>;
}

type ChronologyDataMap = Map<string, Map<string, ChronologyRawMonthData>>;

interface ChronologyDateData {
	date: Date;
	month: string;
	year: string;
}

interface ChronologyData {
	chronologyIndexData: ChronologyIndexData;
	chronologyMonthlyData: Array<ChronologyMonthlyItem>;
	chronologyYearlyData: Record<string, Array<ChronologyMonthlyItem>>;
	chronologyYears: Array<string>;
	chronologyMonths: Record<string, Array<string>>;
	chronologyDailyData: ChronologyDailyData;
}

// Content dates are UTC instants; bucket in UTC so chronology membership matches displayed dates
export function getDateData(date: Date): ChronologyDateData {
	return {
		date,
		month: String(date.getUTCMonth() + 1).padStart(2, '0'),
		year: String(date.getUTCFullYear()).padStart(4, '0'),
	};
}

// Every UTC day covered by a recorded range, start to end inclusive
// A single date yields one day
function expandRangeDays(start: Date, end: Date | undefined): Array<Date> {
	const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
	const endSource = end ?? start;
	const endDay = Math.max(
		startDay,
		Date.UTC(endSource.getUTCFullYear(), endSource.getUTCMonth(), endSource.getUTCDate()),
	);

	const days: Array<Date> = [];

	for (let time = startDay; time <= endDay; time += millisecondsPerDay) {
		days.push(new Date(time));
	}

	return days;
}

export function buildChronologyDailyData(items: ReadonlyArray<CatalogItem>): ChronologyDailyData {
	const dailyData: ChronologyDailyData = {};

	function addEvent(date: Date, category: keyof ChronologyDailyCounts): void {
		const year = String(date.getUTCFullYear()).padStart(4, '0');
		const dayKey = getDayKey(date);

		let yearData = dailyData[year];

		if (!yearData) {
			yearData = {};
			dailyData[year] = yearData;
		}

		let counts = yearData[dayKey];

		if (!counts) {
			counts = { created: 0, updated: 0, visited: 0 };
			yearData[dayKey] = counts;
		}

		counts[category] += 1;
	}

	for (const item of items) {
		if (R.isIncludedIn(item.collection, collectionsExcluded)) continue;

		addEvent(item.dateCreated, 'created');

		if (item.dateUpdated && getDayKey(item.dateUpdated) !== getDayKey(item.dateCreated)) {
			addEvent(item.dateUpdated, 'updated');
		}

		if (item.dateRecorded) {
			for (const range of getDateRanges(item.dateRecorded)) {
				const rangeDays = expandRangeDays(range.start.date, range.end?.date);

				for (const day of rangeDays) {
					addEvent(day, 'visited');
				}
			}
		}
	}

	return dailyData;
}

export function getMonthName(date: Date): string {
	return date.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
}

function getOrCreateMonthData(chronologyDataMap: ChronologyDataMap, dateData: ChronologyDateData) {
	if (!chronologyDataMap.has(dateData.year)) {
		chronologyDataMap.set(dateData.year, new Map());
	}

	const yearMap = chronologyDataMap.get(dateData.year)!;

	if (!yearMap.has(dateData.month)) {
		const monthName = getMonthName(dateData.date);

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

function addRecordedVisits(chronologyDataMap: ChronologyDataMap, item: CatalogItem): void {
	if (!item.dateRecorded) return;

	const yearsRecorded = new Set<string>();
	const recordedDates = getDateRanges(item.dateRecorded)
		.map((range) => range.start.date)
		.sort((a, b) => b.getTime() - a.getTime());

	for (const recordedDate of recordedDates) {
		const recordedDateData = getDateData(recordedDate);

		if (yearsRecorded.has(recordedDateData.year)) continue;

		yearsRecorded.add(recordedDateData.year);
		getOrCreateMonthData(chronologyDataMap, recordedDateData).visited.add(item);
	}
}

function buildChronologyDataMap(items: ReadonlyArray<CatalogItem>): ChronologyDataMap {
	const chronologyDataMap: ChronologyDataMap = new Map();

	for (const item of items) {
		if (R.isIncludedIn(item.collection, collectionsExcluded)) continue;

		const dateCreatedData = getDateData(item.dateCreated);
		const dateUpdatedData = item.dateUpdated ? getDateData(item.dateUpdated) : undefined;

		if (
			dateUpdatedData &&
			(dateUpdatedData.year !== dateCreatedData.year ||
				dateUpdatedData.month !== dateCreatedData.month)
		) {
			getOrCreateMonthData(chronologyDataMap, dateUpdatedData).updated.add(item);
		}

		getOrCreateMonthData(chronologyDataMap, dateCreatedData).created.add(item);

		addRecordedVisits(chronologyDataMap, item);
	}

	return chronologyDataMap;
}

// The three categories, as either raw buckets or the projected (filtered, capped, deduped) tier result
interface ChronologyTierBuckets {
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
): ChronologyTierBuckets {
	const updatedIds = new Set(updated.map((item) => item.id));

	const createdFiltered = created.filter((item) => !updatedIds.has(item.id));
	const createdIds = new Set(createdFiltered.map((item) => item.id));

	const visitedFiltered = visited.filter(
		(item) => !updatedIds.has(item.id) && !createdIds.has(item.id),
	);

	return { updated, created: createdFiltered, visited: visitedFiltered };
}

interface ChronologyTierOptions {
	entryQuality: number;
	limit?: number | undefined;
}

const monthlyTierOptions: ChronologyTierOptions = { entryQuality: 1 };
const indexTierOptions: ChronologyTierOptions = { entryQuality: 3, limit: 20 };
const yearlyQualityFloor = 2;
const yearlyLimit = 20;

function projectChronologyTier(
	buckets: ChronologyTierBuckets,
	{ entryQuality, limit }: ChronologyTierOptions,
): ChronologyTierBuckets {
	return deduplicateCategories(
		sortAndLimit(
			buckets.updated.filter((item) => item.entryQuality >= entryQuality),
			limit,
		),
		sortAndLimit(
			buckets.created.filter((item) => item.entryQuality >= entryQuality),
			limit,
		),
		sortAndLimit(
			buckets.visited.filter((item) => item.entryQuality >= entryQuality),
			limit,
		),
	);
}

function tierHasData(tier: ChronologyTierBuckets): boolean {
	return tier.updated.length > 0 || tier.created.length > 0 || tier.visited.length > 0;
}

// Counts reflect the full bucket totals (before the entry quality floor and cap), unlike the tier lists
function getBucketCounts(buckets: ChronologyTierBuckets) {
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
	yearBuckets: ChronologyTierBuckets,
): Map<string, keyof ChronologyTierBuckets> {
	const winning = new Map<string, keyof ChronologyTierBuckets>();

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

interface ChronologyMonthBuckets extends ChronologyTierBuckets {
	raw: ChronologyRawMonthData;
}

function toMonthBuckets(raw: ChronologyRawMonthData): ChronologyMonthBuckets {
	return {
		raw,
		updated: [...raw.updated],
		created: [...raw.created],
		visited: [...raw.visited],
	};
}

function buildMonthlyItems(
	months: Array<ChronologyMonthBuckets>,
	chronologyMap: Map<string, CollectionEntry<'chronology'>>,
): Array<ChronologyMonthlyItem> {
	const monthlyItems: Array<ChronologyMonthlyItem> = [];

	for (const month of months) {
		const tier = projectChronologyTier(month, monthlyTierOptions);

		if (!tierHasData(tier)) continue;

		monthlyItems.push({
			...month.raw,
			highlights: undefined,
			...getBucketCounts(month),
			...tier,
			chronologyEntry: chronologyMap.get(month.raw.id),
		});
	}

	return monthlyItems;
}

// An entry occupies its highest-precedence category for the year; the monthly highlights carry over
function buildYearlyItems(
	months: Array<ChronologyMonthBuckets>,
	yearBuckets: ChronologyTierBuckets,
	monthlyHighlightsById: ReadonlyMap<string, ChronologyMonthlyItem['highlights']>,
): Array<ChronologyMonthlyItem> {
	const winningCategory = getYearlyWinningCategories(yearBuckets);
	const yearlyItems: Array<ChronologyMonthlyItem> = [];

	for (const month of months) {
		const takeWinners = (category: keyof ChronologyTierBuckets) =>
			sortAndLimit(
				month[category].filter((item) => winningCategory.get(item.id) === category),
				yearlyLimit,
			);

		const tier: ChronologyTierBuckets = {
			updated: takeWinners('updated'),
			created: takeWinners('created'),
			visited: takeWinners('visited'),
		};

		if (!tierHasData(tier)) continue;

		yearlyItems.push({
			...month.raw,
			highlights: monthlyHighlightsById.get(month.raw.id),
			...getBucketCounts(month),
			...tier,
		});
	}

	return yearlyItems;
}

export function createChronologyData(
	items: ReadonlyArray<CatalogItem>,
	chronologyEntries: Array<CollectionEntry<'chronology'>>,
): ChronologyData {
	const chronologyDataMap = buildChronologyDataMap(items);

	const chronologyMap = new Map<string, CollectionEntry<'chronology'>>();

	for (const entry of chronologyEntries) {
		chronologyMap.set(entry.id, entry);
	}

	const chronologyMonthlyData: ChronologyData['chronologyMonthlyData'] = [];
	const chronologyYearlyData: ChronologyData['chronologyYearlyData'] = {};
	const chronologyIndexData: ChronologyData['chronologyIndexData'] = {};
	const chronologyMonths: Record<string, Array<string>> = {};

	// Index highlights span all years
	// Iterate newest-first so the most recent year keeps a featured image shared across years
	const selectIndexHighlights = createHighlightSelector();

	const yearEntries = [...chronologyDataMap].sort(([yearA], [yearB]) => yearB.localeCompare(yearA));

	for (const [year, yearlyData] of yearEntries) {
		const months = [...yearlyData.values()].map(toMonthBuckets);

		// Monthly view data
		const yearMonthlyItems = buildMonthlyItems(months, chronologyMap);

		chronologyMonthlyData.push(...yearMonthlyItems);
		chronologyMonths[year] = yearMonthlyItems.map((item) => item.month);

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
		const yearBuckets: ChronologyTierBuckets = {
			updated: months.flatMap((month) => month.updated),
			created: months.flatMap((month) => month.created),
			visited: months.flatMap((month) => month.visited),
		};

		const yearlyItems = buildYearlyItems(months, yearBuckets, monthlyHighlightsById);

		if (yearlyItems.length > 0) chronologyYearlyData[year] = yearlyItems;

		// Index view; year-level aggregation
		const indexTier = projectChronologyTier(yearBuckets, indexTierOptions);

		if (!tierHasData(indexTier)) continue;

		chronologyIndexData[year] = {
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

	const chronologyYears = Object.keys(chronologyYearlyData).sort((a, b) => b.localeCompare(a));
	const yearHasView = new Set(chronologyYears);

	const chronologyDailyData = buildChronologyDailyData(items);

	return {
		chronologyIndexData,
		chronologyYearlyData,
		chronologyMonthlyData: chronologyMonthlyData.filter((item) => yearHasView.has(item.year)),
		chronologyYears,
		chronologyMonths: Object.fromEntries(
			Object.entries(chronologyMonths).filter(([year]) => yearHasView.has(year)),
		),
		chronologyDailyData: Object.fromEntries(
			Object.entries(chronologyDailyData).filter(([year]) => yearHasView.has(year)),
		),
	};
}
