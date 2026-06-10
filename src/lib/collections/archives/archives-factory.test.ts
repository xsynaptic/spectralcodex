import { describe, expect, test } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';
import { createArchivesData } from '#lib/collections/archives/archives-factory.ts';

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

const monthlyItem = (data: ReturnType<typeof createArchivesData>, id: string) => {
	const item = data.archivesMonthlyData.find((entry) => entry.id === id);

	if (!item) throw new Error(`No monthly item for "${id}"`);

	return item;
};

describe('createArchivesData', () => {
	test('excludes the pages collection from every tier', () => {
		const data = createArchivesData(
			[
				makeCatalogItem({ id: 'a-page', collection: 'pages', dateCreated: new Date(2024, 2, 10) }),
				makeCatalogItem({ id: 'a-post', collection: 'posts', dateCreated: new Date(2024, 2, 10) }),
			],
			[],
		);

		const month = monthlyItem(data, '2024/03');

		expect(ids(month.created)).toEqual(['a-post']);
		expect(ids(data.archivesIndexData['2024']?.created ?? [])).toEqual(['a-post']);
	});

	test('dedup precedence within a month is updated > created > visited', () => {
		const data = createArchivesData(
			[
				// Created and visited in the same month -> kept as created
				makeCatalogItem({
					id: 'created-and-visited',
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					dateVisited: [new Date(2024, 2, 20)],
				}),
				// Updated (from a different create month) and visited in the same month -> kept as updated
				makeCatalogItem({
					id: 'updated-and-visited',
					collection: 'posts',
					dateCreated: new Date(2024, 0, 5),
					dateUpdated: new Date(2024, 2, 15),
					dateVisited: [new Date(2024, 2, 25)],
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
				id: `item-${String(index)}`,
				collection: 'posts',
				dateCreated: new Date(2024, 2, 10),
			}),
		);

		const data = createArchivesData(items, []);

		const month = monthlyItem(data, '2024/03');

		// Every entry appears; the old 40-item cap no longer truncates the monthly record
		expect(month.createdCount).toBe(50);
		expect(month.created).toHaveLength(50);
	});

	test('within a quality level, a featured image sorts an entry ahead of one without', () => {
		const data = createArchivesData(
			[
				makeCatalogItem({
					id: 'aaa-no-image',
					collection: 'posts',
					dateCreated: new Date(2024, 2, 10),
					entryQuality: 2,
				}),
				makeCatalogItem({
					id: 'zzz-with-image',
					collection: 'posts',
					imageId: 'img',
					dateCreated: new Date(2024, 2, 11),
					entryQuality: 2,
				}),
			],
			[],
		);

		// Alphabetically 'aaa' precedes 'zzz', but the image-bearing entry is boosted ahead within q2
		expect(ids(monthlyItem(data, '2024/03').created)).toEqual(['zzz-with-image', 'aaa-no-image']);
	});

	test('monthly highlights do not repeat within a year', () => {
		const data = createArchivesData(
			[
				// Candidate in 2024/01 (created) and 2024/02 (updated) -> highlight in only one
				makeCatalogItem({
					id: 'shared',
					collection: 'posts',
					imageId: 'img-shared',
					dateCreated: new Date(2024, 0, 10),
					dateUpdated: new Date(2024, 1, 15),
				}),
				makeCatalogItem({
					id: 'jan-only',
					collection: 'posts',
					imageId: 'img-jan',
					dateCreated: new Date(2024, 0, 11),
				}),
				makeCatalogItem({
					id: 'feb-only',
					collection: 'posts',
					imageId: 'img-feb',
					dateCreated: new Date(2024, 1, 16),
				}),
			],
			[],
		);

		// Chronological tiebreak: the earliest month (January) shows the shared image, not February
		expect(ids(monthlyItem(data, '2024/01').highlights ?? [])).toContain('shared');
		expect(ids(monthlyItem(data, '2024/02').highlights ?? [])).not.toContain('shared');
	});

	test('the yearly view places a multi-month entry in its highest-precedence slot', () => {
		const data = createArchivesData(
			[
				// Created in 2024/01, updated in 2024/02 -> shows under Feb/updated (updated > created)
				makeCatalogItem({
					id: 'shared',
					collection: 'posts',
					dateCreated: new Date(2024, 0, 10),
					dateUpdated: new Date(2024, 1, 15),
				}),
				makeCatalogItem({
					id: 'jan-only',
					collection: 'posts',
					dateCreated: new Date(2024, 0, 11),
				}),
			],
			[],
		);

		const yearly = data.archivesYearlyData['2024'] ?? [];
		const january = yearly.find((month) => month.month === '01');
		const february = yearly.find((month) => month.month === '02');

		expect(ids(february?.updated ?? [])).toContain('shared');
		expect(ids(january?.created ?? [])).not.toContain('shared');
	});

	test('a year with no yearly view contributes no month pages (no orphans)', () => {
		const data = createArchivesData(
			// Quality 1 is in the complete monthly record but below the yearly floor, so 2019 gets no yearly view
			[
				makeCatalogItem({
					id: 'low',
					collection: 'posts',
					dateCreated: new Date(2019, 2, 10),
					entryQuality: 1,
				}),
			],
			[],
		);

		expect(data.archivesYearlyData['2019']).toBeUndefined();
		// So it must not leave behind month items or a month list that would generate orphan pages
		expect(data.archivesMonthlyData.some((item) => item.year === '2019')).toBe(false);
		expect(data.archivesMonths['2019']).toBeUndefined();
	});

	test('an index highlight shared across years goes to the most recent year', () => {
		const data = createArchivesData(
			[
				// Anchor populates 2023 in the data map before 2024 (oldest-first insertion order)
				// Test fails unless the year loop deliberately iterates newest-first
				makeCatalogItem({
					id: 'anchor-2023',
					collection: 'posts',
					dateCreated: new Date(2023, 5, 9),
				}),
				// Index candidate in 2023 (created) and 2024 (updated) -> highlighted in the most recent year
				makeCatalogItem({
					id: 'shared',
					collection: 'posts',
					imageId: 'img-shared',
					dateCreated: new Date(2023, 5, 10),
					dateUpdated: new Date(2024, 5, 15),
				}),
			],
			[],
		);

		expect(ids(data.archivesIndexData['2024']?.highlights ?? [])).toContain('shared');
		expect(ids(data.archivesIndexData['2023']?.highlights ?? [])).not.toContain('shared');
	});

	test('the index tier requires quality >= 3', () => {
		const belowThreshold = createArchivesData(
			[
				makeCatalogItem({
					id: 'q2',
					collection: 'posts',
					dateCreated: new Date(2024, 5, 10),
					entryQuality: 2,
				}),
			],
			[],
		);

		// Present in monthly (complete record) and yearly (>= 2), absent from the index (>= 3)
		expect(belowThreshold.archivesMonthlyData).toHaveLength(1);
		expect(belowThreshold.archivesIndexData['2024']).toBeUndefined();

		const atThreshold = createArchivesData(
			[
				makeCatalogItem({
					id: 'q3',
					collection: 'posts',
					dateCreated: new Date(2024, 5, 10),
					entryQuality: 3,
				}),
			],
			[],
		);

		expect(ids(atThreshold.archivesIndexData['2024']?.created ?? [])).toEqual(['q3']);
	});
});
