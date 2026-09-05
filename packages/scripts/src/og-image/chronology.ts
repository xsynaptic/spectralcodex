import { ContentCollectionsEnum } from '@spectralcodex/shared/collections';
import { z } from 'zod';

import type { ContentEntry } from '#shared/astro-content.ts';

import { getPublicId } from '#shared/entries.ts';
import { extractImageFeaturedIds } from '#shared/images.ts';

/**
 * Chronology title format: "Chronology: March 2024" or "Chronology: 2024"
 */
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

export function getChronologyTitle(id: string): string {
	const year = Number(id.split('-', 1)[0]);
	const monthPart = id.split('-', 2)[1];

	if (!monthPart) return `Chronology: ${String(year)}`;

	const month = Number(monthPart);

	return `Chronology: ${monthFormatter.format(new Date(year, month - 1))} ${String(year)}`;
}

// Collections contributing dated content to the chronology, mirroring the catalog (every collection except pages)
const chronologyImageCollections: ReadonlyArray<string> = [
	ContentCollectionsEnum.Posts,
	ContentCollectionsEnum.Locations,
	ContentCollectionsEnum.Regions,
	ContentCollectionsEnum.Series,
	ContentCollectionsEnum.Themes,
];

const chronologyCategoryRank = { created: 0, updated: 1, visited: 2 } as const;

type ChronologyCategory = keyof typeof chronologyCategoryRank;

interface ChronologyImageCandidate {
	imageFeaturedId: string;
	entryQuality: number;
	category: ChronologyCategory;
	id: string;
}

function parseChronologyDate(value: unknown): Date | undefined {
	return value instanceof Date ? value : undefined;
}

function getContentDate(value: unknown): Date | undefined {
	if (!value || typeof value !== 'object' || !('date' in value)) return undefined;

	return parseChronologyDate(value.date);
}

// dateRecorded entries are ContentDate objects or [start, end] tuples; pull the date from each
function extractRecordedDates(value: unknown): Array<Date> {
	if (!Array.isArray(value)) return [];

	const dates: Array<Date> = [];

	for (const entry of value) {
		const contentDates = Array.isArray(entry) ? entry : [entry];

		for (const contentDate of contentDates) {
			const date = getContentDate(contentDate);

			if (date) dates.push(date);
		}
	}

	return dates;
}

// Content dates are UTC instants; key periods in UTC so buckets match displayed dates
export function getChronologyPeriodKeys(date: Date): Array<string> {
	const year = String(date.getUTCFullYear()).padStart(4, '0');
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');

	return [year, `${year}-${month}`];
}

function isBetterChronologyCandidate(
	next: ChronologyImageCandidate,
	current: ChronologyImageCandidate,
): boolean {
	if (next.entryQuality !== current.entryQuality) {
		return next.entryQuality > current.entryQuality;
	}

	if (chronologyCategoryRank[next.category] !== chronologyCategoryRank[current.category]) {
		return chronologyCategoryRank[next.category] < chronologyCategoryRank[current.category];
	}

	return next.id < current.id;
}

function extractDatedCategories(
	data: ContentEntry['data'],
): Array<{ date: Date; category: ChronologyCategory }> {
	const dated: Array<{ date: Date; category: ChronologyCategory }> = [];

	const dateCreated = parseChronologyDate(data.dateCreated);

	if (dateCreated) dated.push({ date: dateCreated, category: 'created' });

	const dateUpdated = parseChronologyDate(data.dateUpdated);

	if (dateUpdated) dated.push({ date: dateUpdated, category: 'updated' });

	for (const date of extractRecordedDates(data.dateRecorded)) {
		dated.push({ date, category: 'visited' });
	}

	return dated;
}

function extractEntryCandidate(
	entry: ContentEntry,
): Omit<ChronologyImageCandidate, 'category'> | undefined {
	const imageFeaturedId = extractImageFeaturedIds(entry.data)[0];

	if (!imageFeaturedId) return undefined;

	return {
		imageFeaturedId,
		entryQuality: z.number().optional().parse(entry.data.entryQuality) ?? 0,
		id: getPublicId(entry),
	};
}

// Maps each chronology period to its best content image; one image may represent both a year and a month
export function buildChronologyImageIndex(entries: Array<ContentEntry>): Map<string, string> {
	const candidates = new Map<string, ChronologyImageCandidate>();

	function addCandidate(date: Date, candidate: ChronologyImageCandidate): void {
		for (const key of getChronologyPeriodKeys(date)) {
			const current = candidates.get(key);

			if (!current || isBetterChronologyCandidate(candidate, current)) {
				candidates.set(key, candidate);
			}
		}
	}

	for (const collectionName of chronologyImageCollections) {
		for (const entry of entries) {
			if (entry.collection !== collectionName) continue;

			const entryCandidate = extractEntryCandidate(entry);

			if (!entryCandidate) continue;

			for (const { date, category } of extractDatedCategories(entry.data)) {
				addCandidate(date, { ...entryCandidate, category });
			}
		}
	}

	return new Map([...candidates].map(([key, candidate]) => [key, candidate.imageFeaturedId]));
}
