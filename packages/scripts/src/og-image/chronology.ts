import { ContentCollectionsEnum } from '@spectralcodex/shared/schemas';
import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store.js';

import { getPublicId } from '../shared/data-store.js';
import { extractImageFeaturedIds } from '../shared/images.js';

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
	ContentCollectionsEnum.Notes,
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
	if (value instanceof Date) return value;

	if (typeof value === 'string') {
		const date = new Date(value);

		return Number.isNaN(date.getTime()) ? undefined : date;
	}

	return undefined;
}

// dateRecorded entries are ContentDate objects or [start, end] tuples; pull the date from each
function extractRecordedDates(value: unknown): Array<Date> {
	if (!Array.isArray(value)) return [];

	const dates: Array<Date> = [];

	for (const entry of value) {
		const contentDates = Array.isArray(entry) ? entry : [entry];

		for (const contentDate of contentDates) {
			const raw =
				contentDate && typeof contentDate === 'object' && 'date' in contentDate
					? (contentDate as { date: unknown }).date
					: undefined;
			const date = parseChronologyDate(raw);

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

// Maps each chronology period to its best content image; one image may represent both a year and a month
export function buildChronologyImageIndex(
	collections: Map<string, Map<string, DataStoreEntry>>,
): Map<string, string> {
	const candidates = new Map<string, ChronologyImageCandidate>();

	function addCandidate(key: string, candidate: ChronologyImageCandidate): void {
		const current = candidates.get(key);

		if (!current || isBetterChronologyCandidate(candidate, current)) {
			candidates.set(key, candidate);
		}
	}

	for (const collectionName of chronologyImageCollections) {
		const collection = collections.get(collectionName);

		if (!collection) continue;

		for (const entry of collection.values()) {
			const imageFeaturedId = extractImageFeaturedIds(entry.data)[0];

			if (!imageFeaturedId) continue;

			const entryQuality = z.number().optional().parse(entry.data.entryQuality) ?? 0;
			const id = getPublicId(entry);

			const dated: Array<{ date: Date; category: ChronologyCategory }> = [];

			const dateCreated = parseChronologyDate(entry.data.dateCreated);

			if (dateCreated) dated.push({ date: dateCreated, category: 'created' });

			const dateUpdated = parseChronologyDate(entry.data.dateUpdated);

			if (dateUpdated) dated.push({ date: dateUpdated, category: 'updated' });

			for (const date of extractRecordedDates(entry.data.dateRecorded)) {
				dated.push({ date, category: 'visited' });
			}

			for (const { date, category } of dated) {
				const candidate: ChronologyImageCandidate = { imageFeaturedId, entryQuality, category, id };

				for (const key of getChronologyPeriodKeys(date)) addCandidate(key, candidate);
			}
		}
	}

	return new Map([...candidates].map(([key, candidate]) => [key, candidate.imageFeaturedId]));
}
