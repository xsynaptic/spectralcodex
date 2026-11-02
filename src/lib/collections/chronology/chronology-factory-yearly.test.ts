import { describe, expect, test } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';
import { createChronologyData } from '#lib/collections/chronology/chronology-factory.ts';

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

describe('createChronologyData yearly and index tiers', () => {
	test('the yearly view places a multi-month entry in its highest-precedence slot', () => {
		const data = createChronologyData(
			[
				// Created in 2024/01, updated in 2024/02 -> shows under Feb/updated (updated > created)
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 0, 10),
					dateUpdated: new Date(2024, 1, 15),
					id: 'shared',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 0, 11),
					id: 'jan-only',
				}),
			],
			[],
		);

		const yearly = data.chronologyYearlyData['2024'] ?? [];
		const january = yearly.find((month) => month.month === '01');
		const february = yearly.find((month) => month.month === '02');

		expect(ids(february?.updated ?? [])).toContain('shared');
		expect(ids(january?.created ?? [])).not.toContain('shared');
	});

	test('a year with no yearly view contributes no month pages (no orphans)', () => {
		const data = createChronologyData(
			// Quality 1 is in the complete monthly record but below the yearly floor, so 2019 gets no yearly view
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2019, 2, 10),
					entryQuality: 1,
					id: 'low',
				}),
				makeCatalogItem({ collection: 'posts', dateCreated: new Date(2024, 2, 10), id: 'kept' }),
			],
			[],
		);

		expect(data.chronologyYearlyData['2019']).toBeUndefined();
		// A year with no view generates no pages, so anything keyed to it would orphan
		expect(data.chronologyMonthlyData.some((item) => item.year === '2019')).toBe(false);
		expect(data.chronologyMonths['2019']).toBeUndefined();
		expect(data.chronologyDailyData['2019']).toBeUndefined();

		expect(data.chronologyMonthlyData.some((item) => item.year === '2024')).toBe(true);
		expect(data.chronologyMonths['2024']).toEqual(['03']);
		expect(data.chronologyDailyData['2024']).toBeDefined();
	});

	test('the yearly view reuses the monthly highlights', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					id: 'featured',
					imageId: 'img',
				}),
			],
			[],
		);

		const march = (data.chronologyYearlyData['2024'] ?? []).find((month) => month.month === '03');
		const marchMonthly = data.chronologyMonthlyData.find((item) => item.id === '2024/03');

		expect(ids(march?.highlights ?? [])).toEqual(['featured']);
		expect(ids(marchMonthly?.highlights ?? [])).toEqual(['featured']);
	});

	test('years run newest first', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({ collection: 'posts', dateCreated: new Date(2020, 5, 10), id: 'a' }),
				makeCatalogItem({ collection: 'posts', dateCreated: new Date(2024, 5, 10), id: 'b' }),
				makeCatalogItem({ collection: 'posts', dateCreated: new Date(2022, 5, 10), id: 'c' }),
			],
			[],
		);

		expect(data.chronologyYears).toEqual(['2024', '2022', '2020']);
	});
});

describe('createChronologyData index tier', () => {
	test('an entry created, updated, and visited in one year appears once, under updated', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 0, 10),
					dateRecorded: [{ date: new Date(2024, 2, 20), hasTime: false }],
					dateUpdated: new Date(2024, 1, 15),
					id: 'everywhere',
				}),
			],
			[],
		);

		const index = data.chronologyIndexData['2024'];

		expect(ids(index?.updated ?? [])).toEqual(['everywhere']);
		expect(index?.created).toEqual([]);
		expect(index?.visited).toEqual([]);
		// Counts are the full bucket totals, taken before the dedup
		expect(index).toMatchObject({ createdCount: 1, updatedCount: 1, visitedCount: 1 });
	});

	test('an entry only visited in a year still earns a yearly slot', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2022, 5, 10),
					dateRecorded: [{ date: new Date(2024, 6, 20), hasTime: false }],
					id: 'revisited',
				}),
			],
			[],
		);

		const july = (data.chronologyYearlyData['2024'] ?? []).find((month) => month.month === '07');

		expect(ids(july?.visited ?? [])).toEqual(['revisited']);
	});

	test('the yearly floor of quality 2 holds in every category', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					entryQuality: 2,
					id: 'q2-created',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 2, 11),
					dateRecorded: [{ date: new Date(2024, 2, 12), hasTime: false }],
					entryQuality: 1,
					id: 'q1-visited',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 2, 13),
					dateUpdated: new Date(2024, 2, 14),
					entryQuality: 1,
					id: 'q1-updated',
				}),
			],
			[],
		);

		const march = (data.chronologyYearlyData['2024'] ?? []).find((month) => month.month === '03');

		expect(ids(march?.created ?? [])).toEqual(['q2-created']);
		expect(march?.visited).toEqual([]);
		expect(march?.updated).toEqual([]);
	});
});

describe('createChronologyData index limits', () => {
	test('the index tier caps each category at twenty', () => {
		const items = Array.from({ length: 25 }, (_, index) =>
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date(2024, 2, 10),
				id: `item-${String(index).padStart(2, '0')}`,
			}),
		);

		const data = createChronologyData(items, []);

		expect(data.chronologyIndexData['2024']?.created).toHaveLength(20);
		expect(data.chronologyIndexData['2024']?.createdCount).toBe(25);
	});

	test('an index highlight shared across years goes to the most recent year', () => {
		const data = createChronologyData(
			[
				// Anchor populates 2023 in the data map before 2024 (oldest-first insertion order)
				// Test fails unless the year loop deliberately iterates newest-first
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 5, 9),
					id: 'anchor-2023',
				}),
				// Index candidate in 2023 (created) and 2024 (updated) -> highlighted in the most recent year
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 5, 10),
					dateUpdated: new Date(2024, 5, 15),
					id: 'shared',
					imageId: 'img-shared',
				}),
			],
			[],
		);

		expect(ids(data.chronologyIndexData['2024']?.highlights ?? [])).toContain('shared');
		expect(ids(data.chronologyIndexData['2023']?.highlights ?? [])).not.toContain('shared');
	});

	test('the index tier requires quality >= 3 in every category', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 5, 10),
					entryQuality: 3,
					id: 'c3',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 5, 11),
					entryQuality: 2,
					id: 'c2',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 0, 10),
					dateUpdated: new Date(2024, 1, 15),
					entryQuality: 3,
					id: 'u3',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 0, 11),
					dateUpdated: new Date(2024, 1, 16),
					entryQuality: 2,
					id: 'u2',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 0, 12),
					dateRecorded: [{ date: new Date(2024, 2, 20), hasTime: false }],
					entryQuality: 3,
					id: 'v3',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 0, 13),
					dateRecorded: [{ date: new Date(2024, 2, 21), hasTime: false }],
					entryQuality: 2,
					id: 'v2',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2022, 5, 10),
					entryQuality: 2,
					id: 'below-threshold',
				}),
			],
			[],
		);

		const index = data.chronologyIndexData['2024'];

		expect(ids(index?.created ?? [])).toEqual(['c3']);
		expect(ids(index?.updated ?? [])).toEqual(['u3']);
		expect(ids(index?.visited ?? [])).toEqual(['v3']);

		// Present in monthly (complete record) and yearly (>= 2), absent from the index (>= 3)
		expect(data.chronologyMonthlyData.some((item) => item.year === '2022')).toBe(true);
		expect(data.chronologyIndexData['2022']).toBeUndefined();
	});
});
