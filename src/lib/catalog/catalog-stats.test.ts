import { describe, expect, test, vi } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';

const { getCatalogMock, getImagesCollectionMock } = vi.hoisted(() => ({
	getCatalogMock: vi.fn(),
	getImagesCollectionMock: vi.fn(),
}));

vi.mock('#lib/catalog/catalog-data.ts', () => ({ getCatalog: getCatalogMock }));
vi.mock('#lib/collections/images/images-data.ts', () => ({
	getImagesCollection: getImagesCollectionMock,
}));

const { getCatalogStats } = await import('#lib/catalog/catalog-stats.ts');

async function statsFor(items: Array<CatalogItem>, imageCount = 0) {
	getCatalogMock.mockResolvedValue(createCatalog(items));
	getImagesCollectionMock.mockResolvedValue({ entries: Array.from({ length: imageCount }) });

	return getCatalogStats();
}

describe('getCatalogStats', () => {
	test('an empty catalog reports zeros rather than blanks for every collection', async () => {
		const stats = await statsFor([]);

		expect(stats.posts).toStrictEqual({ itemCount: '0', wordCount: '0' });
		expect(stats.locations).toStrictEqual({ itemCount: '0', withImages: '0', wordCount: '0' });
		expect(stats.total).toStrictEqual({ itemCount: '0', wordCount: '0' });
	});

	test('items are counted against their own collection', async () => {
		const stats = await statsFor([
			makeCatalogItem({ collection: 'posts', id: 'a' }),
			makeCatalogItem({ collection: 'posts', id: 'b' }),
			makeCatalogItem({ collection: 'themes', id: 'c' }),
		]);

		expect(stats.posts.itemCount).toBe('2');
		expect(stats.themes.itemCount).toBe('1');
		expect(stats.regions.itemCount).toBe('0');
		expect(stats.total.itemCount).toBe('3');
	});

	test('an entry with no word count contributes zero instead of poisoning the sum', async () => {
		const stats = await statsFor([
			makeCatalogItem({ collection: 'posts', id: 'a', wordCount: 900 }),
			makeCatalogItem({ collection: 'posts', id: 'b', wordCount: undefined }),
		]);

		expect(stats.posts.wordCount).toBe('900');
	});

	test('large counts are thousands-separated for display', async () => {
		const stats = await statsFor(
			[makeCatalogItem({ collection: 'posts', id: 'a', wordCount: 12_345 })],
			1234,
		);

		expect(stats.posts.wordCount).toBe('12,345');
		expect(stats.images.itemCount).toBe('1,234');
	});

	test('only locations carrying a featured image count toward withImages', async () => {
		const stats = await statsFor([
			makeCatalogItem({ collection: 'locations', id: 'a', imageId: 'image-a' }),
			makeCatalogItem({ collection: 'locations', id: 'b', imageId: undefined }),
			makeCatalogItem({ collection: 'posts', id: 'c', imageId: 'image-c' }),
		]);

		expect(stats.locations.itemCount).toBe('2');
		expect(stats.locations.withImages).toBe('1');
	});

	test('outbound links are summed across every collection at once', async () => {
		const stats = await statsFor([
			makeCatalogItem({ collection: 'posts', id: 'a', linksExternalCount: 3 }),
			makeCatalogItem({ collection: 'locations', id: 'b', linksExternalCount: 4 }),
			makeCatalogItem({ collection: 'regions', id: 'c', linksExternalCount: undefined }),
		]);

		expect(stats.linksExternal.itemCount).toBe('7');
	});

	test('the total covers catalog entries only, leaving images out', async () => {
		const stats = await statsFor(
			[
				makeCatalogItem({ collection: 'posts', id: 'a', wordCount: 100 }),
				makeCatalogItem({ collection: 'series', id: 'b', wordCount: 50 }),
			],
			5,
		);

		expect(stats.total).toStrictEqual({ itemCount: '2', wordCount: '150' });
		expect(stats.images.itemCount).toBe('5');
	});
});
