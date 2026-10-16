import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import {
	createLookupByIds,
	makeCatalogItemFor,
	makeEntry,
	makeListingLocations,
} from '#lib/collections/collections-test-utils.ts';

const { getCatalogMock, getLocationsByIdsMock, getPostsByIdsMock, getThemesCollectionMock } =
	vi.hoisted(() => ({
		getCatalogMock: vi.fn(),
		getLocationsByIdsMock: vi.fn(),
		getPostsByIdsMock: vi.fn(),
		getThemesCollectionMock: vi.fn(),
	}));

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));
vi.mock('#lib/catalog/catalog-data.ts', () => ({ getCatalog: getCatalogMock }));
vi.mock('#lib/collections/locations/locations-data.ts', () => ({
	createLocationsByIdsFunction: () => Promise.resolve(getLocationsByIdsMock),
}));
vi.mock('#lib/collections/posts/posts-data.ts', () => ({
	createPostsByIdsFunction: () => Promise.resolve(getPostsByIdsMock),
}));
vi.mock('#lib/collections/regions/regions-data.ts', () => ({
	createFirstRegionByReferenceFunction: () => Promise.resolve(vi.fn()),
}));
vi.mock('#lib/collections/themes/themes-data.ts', () => ({
	getThemesCollection: getThemesCollectionMock,
}));
vi.mock('#lib/map/map-data.ts', () => ({
	createMapDataFunction: () => Promise.resolve(() => ({ hasGeodata: false })),
}));
vi.mock('#lib/map/map-directory.ts', () => ({
	getMapThemeIndexById: () => Promise.resolve(new Map()),
}));
vi.mock('#lib/map/map-locations.ts', () => ({
	getThemeMapRule: vi.fn(),
	hasEntryMap: () => false,
}));

const { createQueryThemesEntryFunction } = await import('#lib/collections/themes/themes-utils.ts');

const locations = makeListingLocations();
const posts = [makeEntry('posts', 'post', { imageFeatured: 'image' })];
const theme = makeEntry('themes', 'theaters', {
	_locations: locations.map(({ id }) => id),
	_posts: ['post'],
});

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

beforeEach(() => {
	getLocationsByIdsMock.mockImplementation(createLookupByIds(locations));
	getPostsByIdsMock.mockImplementation(createLookupByIds(posts));
	getThemesCollectionMock.mockResolvedValue({ entries: [theme] });
	getCatalogMock.mockResolvedValue(
		createCatalog([...locations, ...posts, theme].map((entry) => makeCatalogItemFor(entry))),
	);
});

describe('queryThemesEntry listings', () => {
	test('featured takes Locations at the floor with an image, plus every Post', async () => {
		const { catalogItemsFiltered } = (await createQueryThemesEntryFunction())(theme);

		expect(ids(catalogItemsFiltered)).toStrictEqual(['listed', 'post']);
	});

	test('the rest list drops unlisted Locations but keeps geometry-hidden ones', async () => {
		const { catalogItems, catalogItemsCount } = (await createQueryThemesEntryFunction())(theme);

		expect(new Set(ids(catalogItems))).toStrictEqual(
			new Set(['below-floor', 'geometry-hidden', 'no-image']),
		);
		expect(catalogItemsCount).toBe(3);
	});
});
