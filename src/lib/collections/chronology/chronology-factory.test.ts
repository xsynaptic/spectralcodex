import { describe, expect, test } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';
import {
	buildChronologyDailyData,
	createChronologyData,
	getDateData,
	getMonthName,
} from '#lib/collections/chronology/chronology-factory.ts';

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

const monthlyItem = (data: ReturnType<typeof createChronologyData>, id: string) => {
	const item = data.chronologyMonthlyData.find((entry) => entry.id === id);

	if (!item) throw new Error(`No monthly item for "${id}"`);

	return item;
};

describe('createChronologyData', () => {
	test('excludes the pages collection from every tier', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({ collection: 'pages', dateCreated: new Date(2024, 2, 10), id: 'a-page' }),
				makeCatalogItem({ collection: 'posts', dateCreated: new Date(2024, 2, 10), id: 'a-post' }),
			],
			[],
		);

		const month = monthlyItem(data, '2024/03');

		expect(ids(month.created)).toEqual(['a-post']);
		expect(ids(data.chronologyIndexData['2024']?.created ?? [])).toEqual(['a-post']);
	});
});

describe('createChronologyData monthly tier', () => {
	test('dedup precedence within a month is updated > created > visited', () => {
		const data = createChronologyData(
			[
				// Created and visited in the same month -> kept as created
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					dateRecorded: [{ date: new Date(2024, 2, 20), hasTime: false }],
					id: 'created-and-visited',
				}),
				// Updated (from a different create month) and visited in the same month -> kept as updated
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 0, 5),
					dateRecorded: [{ date: new Date(2024, 2, 25), hasTime: false }],
					dateUpdated: new Date(2024, 2, 15),
					id: 'updated-and-visited',
				}),
			],
			[],
		);

		const month = monthlyItem(data, '2024/03');

		expect(ids(month.updated)).toEqual(['updated-and-visited']);
		expect(ids(month.created)).toEqual(['created-and-visited']);
		expect(ids(month.visited)).toEqual([]);
	});

	test('the monthly view is the complete record with no cap', () => {
		const items = Array.from({ length: 50 }, (_, index) =>
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date(2024, 2, 10),
				id: `item-${String(index)}`,
			}),
		);

		const data = createChronologyData(items, []);

		const month = monthlyItem(data, '2024/03');

		// Every entry appears; the old 40-item cap no longer truncates the monthly record
		expect(month.createdCount).toBe(50);
		expect(month.created).toHaveLength(50);
	});

	test('within a quality level, a featured image sorts an entry ahead of one without', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					entryQuality: 2,
					id: 'aaa-no-image',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 11),
					entryQuality: 2,
					id: 'zzz-with-image',
					imageId: 'img',
				}),
			],
			[],
		);

		// Alphabetically 'aaa' precedes 'zzz', but the image-bearing entry is boosted ahead within q2
		expect(ids(monthlyItem(data, '2024/03').created)).toEqual(['zzz-with-image', 'aaa-no-image']);
	});

	test('monthly highlights do not repeat within a year', () => {
		const data = createChronologyData(
			[
				// Candidate in 2024/01 (created) and 2024/02 (updated) -> highlight in only one
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 0, 10),
					dateUpdated: new Date(2024, 1, 15),
					id: 'shared',
					imageId: 'img-shared',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 0, 11),
					id: 'jan-only',
					imageId: 'img-jan',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 1, 16),
					id: 'feb-only',
					imageId: 'img-feb',
				}),
			],
			[],
		);

		// Chronological tiebreak: the earliest month (January) shows the shared image, not February
		expect(ids(monthlyItem(data, '2024/01').highlights ?? [])).toContain('shared');
		expect(ids(monthlyItem(data, '2024/02').highlights ?? [])).not.toContain('shared');
	});
});

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
			],
			[],
		);

		expect(data.chronologyYearlyData['2019']).toBeUndefined();
		// So it must not leave behind month items or a month list that would generate orphan pages
		expect(data.chronologyMonthlyData.some((item) => item.year === '2019')).toBe(false);
		expect(data.chronologyMonths['2019']).toBeUndefined();
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

	test('the index tier requires quality >= 3', () => {
		const belowThreshold = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 5, 10),
					entryQuality: 2,
					id: 'q2',
				}),
			],
			[],
		);

		// Present in monthly (complete record) and yearly (>= 2), absent from the index (>= 3)
		expect(belowThreshold.chronologyMonthlyData).toHaveLength(1);
		expect(belowThreshold.chronologyIndexData['2024']).toBeUndefined();

		const atThreshold = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 5, 10),
					entryQuality: 3,
					id: 'q3',
				}),
			],
			[],
		);

		expect(ids(atThreshold.chronologyIndexData['2024']?.created ?? [])).toEqual(['q3']);
	});
});

describe('getDateData', () => {
	test('buckets a late-evening UTC instant in its UTC month', () => {
		expect(getDateData(new Date('2024-05-31T20:00:00Z'))).toMatchObject({
			month: '05',
			year: '2024',
		});
	});

	test('buckets UTC midnight at a month boundary in the new month', () => {
		expect(getDateData(new Date('2024-06-01T00:00:00Z'))).toMatchObject({
			month: '06',
			year: '2024',
		});
	});
});

describe('getMonthName', () => {
	test('names the UTC month regardless of local timezone', () => {
		expect(getMonthName(new Date('2024-05-31T20:00:00Z'))).toBe('May');
	});
});

describe('buildChronologyDailyData', () => {
	// UTC-instant literals so day bucketing stays timezone stable (getUTC* reads)
	test('tallies a creation on its UTC day', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2024-03-10T12:00:00Z'),
				id: 'a',
			}),
		]);

		expect(daily['2024']?.['2024-03-10']).toEqual({ created: 1, updated: 0, visited: 0 });
	});

	test('buckets a late-evening UTC instant on its UTC day, not the local one', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2024-05-31T20:00:00Z'),
				id: 'a',
			}),
		]);

		expect(daily['2024']?.['2024-05-31']).toMatchObject({ created: 1 });
	});

	test('does not count an update made on the same UTC day as creation', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2024-03-10T02:00:00Z'),
				dateUpdated: new Date('2024-03-10T20:00:00Z'),
				id: 'a',
			}),
		]);

		expect(daily['2024']?.['2024-03-10']).toEqual({ created: 1, updated: 0, visited: 0 });
	});

	test('counts an update made on a different UTC day from creation', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2024-03-10T12:00:00Z'),
				dateUpdated: new Date('2024-03-12T12:00:00Z'),
				id: 'a',
			}),
		]);

		expect(daily['2024']?.['2024-03-10']).toMatchObject({ created: 1, updated: 0 });
		expect(daily['2024']?.['2024-03-12']).toMatchObject({ created: 0, updated: 1 });
	});

	test('expands a recorded range so every day start-to-end inclusive is visited', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2023-01-01T12:00:00Z'),
				dateRecorded: [
					[
						{ date: new Date('2024-03-10T12:00:00Z'), hasTime: false },
						{ date: new Date('2024-03-12T12:00:00Z'), hasTime: false },
					],
				],
				id: 'a',
			}),
		]);

		expect(daily['2024']?.['2024-03-10']?.visited).toBe(1);
		expect(daily['2024']?.['2024-03-11']?.visited).toBe(1);
		expect(daily['2024']?.['2024-03-12']?.visited).toBe(1);
		expect(daily['2024']?.['2024-03-13']).toBeUndefined();
	});

	test('treats a single recorded date as one visited day', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2023-01-01T12:00:00Z'),
				dateRecorded: [{ date: new Date('2024-03-15T12:00:00Z'), hasTime: false }],
				id: 'a',
			}),
		]);

		expect(daily['2024']?.['2024-03-15']).toEqual({ created: 0, updated: 0, visited: 1 });
	});

	test('excludes the pages collection', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'pages',
				dateCreated: new Date('2024-03-10T12:00:00Z'),
				id: 'a-page',
			}),
		]);

		expect(daily['2024']).toBeUndefined();
	});
});
