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
		expect(Object.values(data.chronologyDailyData['2024'] ?? {})).toEqual([
			{ created: 1, updated: 0, visited: 0 },
		]);
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
});

describe('createChronologyData monthly buckets', () => {
	test('an update in the same month as creation does not double count', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					dateUpdated: new Date(2024, 2, 20),
					id: 'same-month',
				}),
			],
			[],
		);

		const march = monthlyItem(data, '2024/03');

		expect(ids(march.created)).toEqual(['same-month']);
		expect(march.updated).toEqual([]);
		expect(march.updatedCount).toBe(0);
	});

	test('an update in a later year counts as updated in that year', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2023, 10, 10),
					dateUpdated: new Date(2024, 0, 15),
					id: 'carried-over',
				}),
			],
			[],
		);

		expect(ids(monthlyItem(data, '2024/01').updated)).toEqual(['carried-over']);
		expect(ids(monthlyItem(data, '2023/11').created)).toEqual(['carried-over']);
	});

	test('a recorded history lands once per year, on the latest date in that year', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2019, 5, 10),
					dateRecorded: [
						{ date: new Date(2024, 2, 10), hasTime: false },
						{ date: new Date(2024, 6, 20), hasTime: false },
						{ date: new Date(2023, 8, 5), hasTime: false },
					],
					id: 'revisited',
				}),
			],
			[],
		);

		expect(ids(monthlyItem(data, '2024/07').visited)).toEqual(['revisited']);
		expect(ids(monthlyItem(data, '2023/09').visited)).toEqual(['revisited']);
		// The losing visit creates no month at all, rather than an empty one
		expect(data.chronologyMonthlyData.some((item) => item.id === '2024/03')).toBe(false);
	});
});

describe('createChronologyData monthly highlights', () => {
	test('a highlight needs both a featured image and quality >= 2', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					entryQuality: 2,
					id: 'q2-image',
					imageId: 'img-a',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 11),
					entryQuality: 1,
					id: 'q1-image',
					imageId: 'img-b',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 12),
					entryQuality: 3,
					id: 'q3-no-image',
				}),
			],
			[],
		);

		expect(ids(monthlyItem(data, '2024/03').highlights ?? [])).toEqual(['q2-image']);
	});
});

describe('createChronologyData monthly ordering', () => {
	test('a month lists entries by quality, then featured image, then title', () => {
		const data = createChronologyData(
			[
				// Listed first and identical to 'a-q2' but for the title, so only the title sort orders them
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 9),
					entryQuality: 2,
					id: 'z-q2',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					entryQuality: 2,
					id: 'a-q2',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 11),
					entryQuality: 3,
					id: 'z-q3',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 2, 12),
					entryQuality: 2,
					id: 'b-q2-image',
					imageId: 'img',
				}),
			],
			[],
		);

		expect(ids(monthlyItem(data, '2024/03').created)).toEqual([
			'z-q3',
			'b-q2-image',
			'a-q2',
			'z-q2',
		]);
	});

	test('highlights run highest quality first, then by title', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 3, 10),
					entryQuality: 2,
					id: 'a-q2',
					imageId: 'img-a',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 3, 11),
					entryQuality: 3,
					id: 'z-q3',
					imageId: 'img-z',
				}),
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 3, 12),
					entryQuality: 3,
					id: 'b-q3',
					imageId: 'img-b',
				}),
			],
			[],
		);

		expect(ids(monthlyItem(data, '2024/04').highlights ?? [])).toEqual(['b-q3', 'z-q3', 'a-q2']);
	});
});

describe('createChronologyData monthly highlight dedup', () => {
	test('a month with no candidate carries no highlights at all', () => {
		const data = createChronologyData(
			[
				makeCatalogItem({
					collection: 'posts',
					dateCreated: new Date(2024, 4, 10),
					entryQuality: 2,
					id: 'no-image',
				}),
			],
			[],
		);

		expect(monthlyItem(data, '2024/05').highlights).toBeUndefined();
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

describe('getDateData', () => {
	test('buckets a late-evening UTC instant in its UTC month', () => {
		expect(getDateData(new Date('2024-05-31T20:00:00Z'))).toMatchObject({
			month: '05',
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

	test('tallies creations on their UTC day, accumulating across entries', () => {
		const daily = buildChronologyDailyData([
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2024-03-10T02:00:00Z'),
				id: 'a',
			}),
			makeCatalogItem({
				collection: 'posts',
				dateCreated: new Date('2024-03-10T20:00:00Z'),
				id: 'b',
			}),
		]);

		expect(daily['2024']?.['2024-03-10']).toEqual({ created: 2, updated: 0, visited: 0 });
	});
});
