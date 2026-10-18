import { expect, test, vi } from 'vitest';

import type { CatalogItem } from '#lib/catalog/catalog-types.ts';

import { createCatalog } from '#lib/catalog/catalog-factory.ts';
import {
	makeCatalogItemFor,
	makeEntry,
	makeListingLocations,
} from '#lib/collections/collections-test-utils.ts';

const locations = [
	...makeListingLocations(),
	makeEntry('locations', 'geometry-hidden-at-floor', {
		dateCreated: new Date(2020, 0, 6),
		entryQuality: 2,
		hideGeometry: true,
		imageFeatured: 'image',
	}),
];

vi.mock('astro:content', () => ({ getCollection: vi.fn() }));
vi.mock('#lib/catalog/catalog-data.ts', () => ({
	getCatalog: () =>
		Promise.resolve(createCatalog(locations.map((entry) => makeCatalogItemFor(entry)))),
}));
vi.mock('#lib/collections/locations/locations-data.ts', () => ({
	getLocationsCollection: () => Promise.resolve({ entries: locations }),
}));
vi.mock('#lib/collections/posts/posts-data.ts', () => ({}));
vi.mock('#lib/collections/regions/regions-data.ts', () => ({}));
vi.mock('#lib/map/map-data.ts', () => ({}));
vi.mock('#lib/map/map-directory.ts', () => ({}));
vi.mock('#lib/map/map-locations.ts', () => ({}));

const { queryLocationsIndex } = await import('#lib/collections/locations/locations-queries.ts');

const ids = (items: ReadonlyArray<CatalogItem>) => items.map((item) => item.id);

test('queryLocationsIndex lists Locations at the floor with an image, newest first', async () => {
	expect(ids(await queryLocationsIndex())).toStrictEqual(['geometry-hidden-at-floor', 'listed']);
});
