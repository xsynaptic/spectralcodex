import { describe, expect, test, vi } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import {
	makeCatalogItemFor,
	makeEntry,
	makeListingLocations,
} from '#lib/collections/collections-test-utils.ts';

const locations = makeListingLocations();
const posts = [makeEntry('posts', 'post', { imageFeatured: 'image' })];

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));
vi.mock('#lib/catalog/catalog-data.ts', () => ({
	getCatalog: () =>
		Promise.resolve(
			createCatalog([...locations, ...posts].map((entry) => makeCatalogItemFor(entry))),
		),
}));
vi.mock('#lib/collections/locations/locations-data.ts', () => ({
	getLocationsCollection: () =>
		Promise.resolve({ entriesMap: new Map(locations.map((entry) => [entry.id, entry])) }),
}));
vi.mock('#lib/collections/posts/posts-data.ts', () => ({
	getPostsCollection: () =>
		Promise.resolve({ entriesMap: new Map(posts.map((entry) => [entry.id, entry])) }),
}));
vi.mock('#lib/collections/regions/regions-data.ts', () => ({
	createFirstRegionByReferenceFunction: () => Promise.resolve(vi.fn()),
}));
vi.mock('#lib/collections/resources/resources-data.ts', () => ({
	getResourceAssociation: () =>
		Promise.resolve({
			locationIdsByResourceId: new Map([['guide', locations.map(({ id }) => id)]]),
			postIdsByResourceId: new Map([['guide', ['post']]]),
		}),
}));
vi.mock('#lib/map/map-data.ts', () => ({
	createMapDataFunction: () => Promise.resolve(() => ({ hasGeodata: false })),
}));
vi.mock('#lib/map/map-locations.ts', () => ({ getLocationsMapRule: vi.fn() }));

const { createQueryResourcesEntryFunction } =
	await import('#lib/collections/resources/resources-queries.ts');

const ids = (items: ReadonlyArray<CatalogItem | { id: string }>) => items.map((item) => item.id);

describe('queryResourcesEntry listing', () => {
	test('lists listed Locations at the floor with an image, newest first', async () => {
		const { catalogItems } = (await createQueryResourcesEntryFunction())(
			makeEntry('resources', 'guide'),
		);

		expect(ids(catalogItems)).toStrictEqual(['listed', 'post']);
	});
});
