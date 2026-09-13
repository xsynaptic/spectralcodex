import { describe, expect, test, vi } from 'vitest';

import type { ChronologyMonthlyItem } from '#lib/collections/chronology/chronology-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';

const { getCatalogMock } = vi.hoisted(() => ({ getCatalogMock: vi.fn() }));

vi.mock('#lib/catalog/catalog-data.ts', () => ({ getCatalog: getCatalogMock }));

const { createChronologyImageFeaturedGroupFunction, getChronologyActivityData } =
	await import('#lib/collections/chronology/chronology-utils.ts');

describe('getChronologyActivityData', () => {
	test('a day value sums all three activity kinds', () => {
		const { values } = getChronologyActivityData({
			'2024-01-01': { created: 1, updated: 2, visited: 3 },
		});

		expect(values['2024-01-01']).toBe(6);
	});

	test('totals accumulate across days while values stay per day', () => {
		const { values, totals } = getChronologyActivityData({
			'2024-01-01': { created: 1, updated: 0, visited: 2 },
			'2024-01-02': { created: 3, updated: 4, visited: 0 },
		});

		expect(values).toStrictEqual({ '2024-01-01': 3, '2024-01-02': 7 });
		expect(totals).toStrictEqual({ created: 4, updated: 4, visited: 2 });
	});

	test('a day with no activity keeps its key, so the graph renders an empty cell', () => {
		const { values } = getChronologyActivityData({
			'2024-01-01': { created: 0, updated: 0, visited: 0 },
		});

		expect(Object.keys(values)).toStrictEqual(['2024-01-01']);
		expect(values['2024-01-01']).toBe(0);
	});

	test('an empty month yields zero totals rather than NaN', () => {
		expect(getChronologyActivityData({})).toStrictEqual({
			values: {},
			totals: { created: 0, updated: 0, visited: 0 },
		});
	});
});

function makeMonthlyItem(overrides: Partial<ChronologyMonthlyItem>): ChronologyMonthlyItem {
	return { highlights: undefined, ...overrides } as ChronologyMonthlyItem;
}

function makeChronologyEntry(imageFeatured: unknown) {
	return { data: { imageFeatured } } as ChronologyMonthlyItem['chronologyEntry'];
}

describe('createChronologyImageFeaturedGroupFunction', () => {
	const highlight = makeCatalogItem({
		id: 'some-location',
		collection: 'locations',
		title: 'Some Location',
		imageId: 'highlight-image',
	});

	getCatalogMock.mockResolvedValue(
		createCatalog([highlight, makeCatalogItem({ id: 'linked-post', collection: 'posts' })]),
	);

	test('a curated image wins over the highlights it would otherwise derive', async () => {
		const getGroup = await createChronologyImageFeaturedGroupFunction();

		const group = getGroup(
			makeMonthlyItem({
				chronologyEntry: makeChronologyEntry('curated-image'),
				highlights: [highlight],
			}),
		);

		expect(group?.map(({ id }) => id)).toStrictEqual(['curated-image']);
	});

	test('a curated image links its caption through the catalog', async () => {
		const getGroup = await createChronologyImageFeaturedGroupFunction();

		const group = getGroup(
			makeMonthlyItem({
				chronologyEntry: makeChronologyEntry([{ id: 'curated-image', link: 'linked-post' }]),
			}),
		);

		expect(group?.at(0)?.caption).toMatchObject({ id: 'linked-post', url: '/linked-post' });
	});

	test('an entry without a curated image falls back to its highlights', async () => {
		const getGroup = await createChronologyImageFeaturedGroupFunction();

		const group = getGroup(
			makeMonthlyItem({
				chronologyEntry: makeChronologyEntry(undefined),
				highlights: [highlight, makeCatalogItem({ id: 'no-image', collection: 'posts' })],
			}),
		);

		expect(group?.map(({ id }) => id)).toStrictEqual(['highlight-image']);
		expect(group?.at(0)?.caption).toMatchObject({ id: 'some-location', title: 'Some Location' });
	});

	test('a month with neither has no image group at all', async () => {
		const getGroup = await createChronologyImageFeaturedGroupFunction();

		expect(getGroup(makeMonthlyItem({ highlights: [] }))).toBeUndefined();
		expect(getGroup(makeMonthlyItem({}))).toBeUndefined();
	});
});
