import { ContentCollectionsEnum } from '@spectralcodex/shared/schemas';
import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store.js';

import { getPublicId } from '../shared/data-store.js';
import { extractImageFeaturedIds } from '../shared/images.js';

/**
 * Archives title format: "Archives: March 2024" or "Archives: 2024"
 */
const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long' });

export function getArchivesTitle(id: string): string {
	const year = Number(id.split('-', 1)[0]);
	const monthPart = id.split('-', 2)[1];

	if (!monthPart) return `Archives: ${String(year)}`;

	const month = Number(monthPart);

	return `Archives: ${monthFormatter.format(new Date(year, month - 1))} ${String(year)}`;
}

// Collections contributing dated content to the archives, mirroring the catalog (every collection except pages)
const archiveImageCollections: ReadonlyArray<string> = [
	ContentCollectionsEnum.Posts,
	ContentCollectionsEnum.Notes,
	ContentCollectionsEnum.Locations,
	ContentCollectionsEnum.Regions,
	ContentCollectionsEnum.Series,
	ContentCollectionsEnum.Themes,
];

const archiveCategoryRank = { created: 0, updated: 1, visited: 2 } as const;

type ArchiveCategory = keyof typeof archiveCategoryRank;

interface ArchiveImageCandidate {
	imageFeaturedId: string;
	entryQuality: number;
	category: ArchiveCategory;
	id: string;
}

function parseArchiveDate(value: unknown): Date | undefined {
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
			const date = parseArchiveDate(raw);

			if (date) dates.push(date);
		}
	}

	return dates;
}

function getArchivePeriodKeys(date: Date): Array<string> {
	const year = String(date.getFullYear()).padStart(4, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0');

	return [year, `${year}-${month}`];
}

function isBetterArchiveCandidate(
	next: ArchiveImageCandidate,
	current: ArchiveImageCandidate,
): boolean {
	if (next.entryQuality !== current.entryQuality) {
		return next.entryQuality > current.entryQuality;
	}

	if (archiveCategoryRank[next.category] !== archiveCategoryRank[current.category]) {
		return archiveCategoryRank[next.category] < archiveCategoryRank[current.category];
	}

	return next.id < current.id;
}

// Maps each archive period to its best content image; one image may represent both a year and a month
export function buildArchiveImageIndex(
	collections: Map<string, Map<string, DataStoreEntry>>,
): Map<string, string> {
	const candidates = new Map<string, ArchiveImageCandidate>();

	function addCandidate(key: string, candidate: ArchiveImageCandidate): void {
		const current = candidates.get(key);

		if (!current || isBetterArchiveCandidate(candidate, current)) {
			candidates.set(key, candidate);
		}
	}

	for (const collectionName of archiveImageCollections) {
		const collection = collections.get(collectionName);

		if (!collection) continue;

		for (const entry of collection.values()) {
			const imageFeaturedId = extractImageFeaturedIds(entry.data)[0];

			if (!imageFeaturedId) continue;

			const entryQuality = z.number().optional().parse(entry.data.entryQuality) ?? 0;
			const id = getPublicId(entry);

			const dated: Array<{ date: Date; category: ArchiveCategory }> = [];

			const dateCreated = parseArchiveDate(entry.data.dateCreated);

			if (dateCreated) dated.push({ date: dateCreated, category: 'created' });

			const dateUpdated = parseArchiveDate(entry.data.dateUpdated);

			if (dateUpdated) dated.push({ date: dateUpdated, category: 'updated' });

			for (const date of extractRecordedDates(entry.data.dateRecorded)) {
				dated.push({ date, category: 'visited' });
			}

			for (const { date, category } of dated) {
				const candidate: ArchiveImageCandidate = { imageFeaturedId, entryQuality, category, id };

				for (const key of getArchivePeriodKeys(date)) addCandidate(key, candidate);
			}
		}
	}

	return new Map([...candidates].map(([key, candidate]) => [key, candidate.imageFeaturedId]));
}
