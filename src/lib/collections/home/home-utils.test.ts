import { describe, expect, test, vi } from 'vitest';

import type { CatalogCollectionKey, CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';

const { getCatalogMock } = vi.hoisted(() => ({ getCatalogMock: vi.fn() }));

vi.mock('#lib/catalog/catalog-data.ts', () => ({ getCatalog: getCatalogMock }));

const { queryHomeData } = await import('#lib/collections/home/home-utils.ts');

function makeItems(
	collection: CatalogCollectionKey,
	count: number,
	overrides: Partial<CatalogItem> = {},
) {
	return Array.from({ length: count }, (_, index) =>
		makeCatalogItem({
			id: `${collection}-${String(index)}`,
			collection,
			imageId: 'featured-image',
			imageHeroId: 'hero-image',
			dateCreated: new Date(2020, 0, index + 1),
			...overrides,
		}),
	);
}

async function queryWith(items: Array<CatalogItem>) {
	getCatalogMock.mockResolvedValue(createCatalog(items));

	return queryHomeData();
}

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

describe('queryHomeData quality filter', () => {
	test('the quality bar is inclusive, cutting only what sits below it', async () => {
		const data = await queryWith([
			makeCatalogItem({ id: 'at-bar', collection: 'posts', entryQuality: 3, imageId: 'i' }),
			makeCatalogItem({ id: 'below-bar', collection: 'posts', entryQuality: 2, imageId: 'i' }),
		]);

		expect(ids(data.recentCatalogItems)).toStrictEqual(['at-bar']);
	});
});

describe('queryHomeData featured items', () => {
	test('a legacy hero is never featured, however good the entry', async () => {
		const data = await queryWith([
			makeCatalogItem({
				id: 'legacy',
				collection: 'posts',
				entryQuality: 5,
				imageId: 'featured-image',
				imageHeroId: 'errata/old-scan',
			}),
			...makeItems('locations', 1),
		]);

		expect(ids(data.featuredCatalogItems)).toStrictEqual(['locations-0']);
	});

	test('a featured image alone does not qualify; the hero does the work', async () => {
		const data = await queryWith(makeItems('posts', 1, { imageHeroId: undefined }));

		expect(data.featuredCatalogItems).toStrictEqual([]);
		expect(ids(data.recentCatalogItems)).toStrictEqual(['posts-0']);
	});

	test('the shuffled sample is capped at five and drawn only from eligible entries', async () => {
		const data = await queryWith(makeItems('locations', 9));

		expect(data.featuredCatalogItems).toHaveLength(5);
		expect(new Set(ids(data.featuredCatalogItems)).size).toBe(5);
	});
});

describe('queryHomeData recent items', () => {
	test('an updated entry outranks a newer one that was never revised', async () => {
		const data = await queryWith([
			makeCatalogItem({
				id: 'created-later',
				collection: 'posts',
				imageId: 'i',
				dateCreated: new Date(2024, 0, 1),
			}),
			makeCatalogItem({
				id: 'updated-later',
				collection: 'posts',
				imageId: 'i',
				dateCreated: new Date(2019, 0, 1),
				dateUpdated: new Date(2025, 0, 1),
			}),
		]);

		expect(ids(data.recentCatalogItems)).toStrictEqual(['updated-later', 'created-later']);
	});

	test('the cap keeps the newest sixteen, not the first sixteen found', async () => {
		const data = await queryWith(makeItems('posts', 20));

		expect(data.recentCatalogItems).toHaveLength(16);
		expect(ids(data.recentCatalogItems).at(0)).toBe('posts-19');
		expect(ids(data.recentCatalogItems)).not.toContain('posts-0');
	});
});

describe('queryHomeData taxonomy items', () => {
	test('series and themes are drawn from their own collections only', async () => {
		const data = await queryWith([
			...makeItems('series', 1),
			...makeItems('themes', 1),
			...makeItems('posts', 1),
		]);

		expect(ids(data.seriesCatalogItems)).toStrictEqual(['series-0']);
		expect(ids(data.themesCatalogItems)).toStrictEqual(['themes-0']);
		expect(ids(data.featuredCatalogItems)).toStrictEqual(['posts-0']);
	});

	test('quality leads and recency breaks ties, capped at four and eight', async () => {
		const data = await queryWith([
			...makeItems('series', 6, { entryQuality: 3 }),
			makeCatalogItem({
				id: 'best-series',
				collection: 'series',
				entryQuality: 5,
				imageId: 'featured-image',
				dateCreated: new Date(2010, 0, 1),
			}),
			...makeItems('themes', 10, { entryQuality: 4 }),
		]);

		expect(ids(data.seriesCatalogItems).at(0)).toBe('best-series');
		expect(data.seriesCatalogItems).toHaveLength(4);
		expect(data.themesCatalogItems).toHaveLength(8);
		expect(ids(data.seriesCatalogItems).at(1)).toBe('series-5');
	});
});
