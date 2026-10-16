import type { CollectionEntry } from 'astro:content';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import {
	createLookupByIds,
	makeCatalogItemFor,
	makeEntry,
	makeListingLocations,
} from '#lib/collections/collections-test-utils.ts';

const { getCatalogMock, getLocationsByIdsMock, getPostsByIdsMock, getRegionsCollectionMock } =
	vi.hoisted(() => ({
		getCatalogMock: vi.fn(),
		getLocationsByIdsMock: vi.fn(),
		getPostsByIdsMock: vi.fn(),
		getRegionsCollectionMock: vi.fn(),
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
	createRegionAncestorsFunction: () =>
		Promise.resolve((region: CollectionEntry<'regions'>) => [region]),
	createRegionsByIdsFunction: () => Promise.resolve(() => []),
	getRegionsCollection: getRegionsCollectionMock,
}));
vi.mock('#lib/map/map-data.ts', () => ({
	createMapDataFunction: () => Promise.resolve(() => ({ hasGeodata: false })),
}));
vi.mock('#lib/map/map-directory.ts', () => ({
	getMapDirectoryData: () => Promise.resolve({ divisionUrlById: new Map() }),
}));
vi.mock('#lib/map/map-locations.ts', () => ({
	getRegionMapRule: vi.fn(),
	hasEntryMap: () => false,
}));

const { createQueryRegionsEntryFunction } =
	await import('#lib/collections/regions/regions-queries.ts');

const locations = makeListingLocations();
const posts = [makeEntry('posts', 'post', { imageFeatured: 'image' })];

function makeRegion(id: string, data: Record<string, unknown> = {}) {
	return makeEntry('regions', id, data);
}

function setRegions(regions: Array<CollectionEntry<'regions'>>) {
	getRegionsCollectionMock.mockResolvedValue({
		entries: regions,
		regionsTree: { intervalById: new Map() },
	});
	getCatalogMock.mockResolvedValue(
		createCatalog([...locations, ...posts, ...regions].map((entry) => makeCatalogItemFor(entry))),
	);
}

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

beforeEach(() => {
	getLocationsByIdsMock.mockImplementation(createLookupByIds(locations));
	getPostsByIdsMock.mockImplementation(createLookupByIds(posts));
});

describe('queryRegionsEntry listings', () => {
	const region = makeRegion('taiwan', {
		_locations: locations.map(({ id }) => id),
		_posts: ['post'],
	});

	test('featured takes Locations at the floor with an image, plus every Post', async () => {
		setRegions([region]);

		const { catalogItemsFiltered } = (await createQueryRegionsEntryFunction())(region);

		expect(ids(catalogItemsFiltered)).toStrictEqual(['listed', 'post']);
	});

	test('the rest list drops unlisted Locations but keeps geometry-hidden ones', async () => {
		setRegions([region]);

		const { catalogItems, catalogItemsCount } = (await createQueryRegionsEntryFunction())(region);

		expect(new Set(ids(catalogItems))).toStrictEqual(
			new Set(['below-floor', 'geometry-hidden', 'no-image']),
		);
		expect(catalogItemsCount).toBe(3);
	});
});
