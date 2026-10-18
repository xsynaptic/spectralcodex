import type { CollectionKey } from 'astro:content';

import type { CatalogCollectionKey, CatalogItem } from '#lib/catalog/catalog-types.ts';
import type { ComputedEntry } from '#lib/collections/collections-types.ts';

import { makeCatalogItem } from '#lib/catalog/catalog-test-utils.ts';

interface FixtureData {
	dateCreated?: Date;
	entryQuality?: number;
	hideFromLists?: boolean;
	imageFeatured?: string;
}

export function makeEntry<T extends CollectionKey>(
	collection: T,
	id: string,
	data: FixtureData & Record<string, unknown> = {},
): ComputedEntry<T> {
	return {
		collection,
		data: { dateCreated: new Date(2020, 0, 1), entryQuality: 3, title: id, ...data },
		id,
	} as unknown as ComputedEntry<T>;
}

export function makeCatalogItemFor(entry: ComputedEntry<CatalogCollectionKey>): CatalogItem {
	const data = entry.data as FixtureData;

	return makeCatalogItem({
		collection: entry.collection,
		dateCreated: data.dateCreated ?? new Date(2020, 0, 1),
		entryQuality: data.entryQuality ?? 3,
		hideFromLists: data.hideFromLists === true,
		id: entry.id,
		imageId: data.imageFeatured,
	});
}

export function makeListingLocations() {
	return [
		makeEntry('locations', 'listed', {
			dateCreated: new Date(2020, 0, 5),
			entryQuality: 2,
			imageFeatured: 'image',
		}),
		makeEntry('locations', 'below-floor', {
			dateCreated: new Date(2020, 0, 4),
			entryQuality: 1,
			imageFeatured: 'image',
		}),
		makeEntry('locations', 'unlisted', {
			dateCreated: new Date(2020, 0, 3),
			entryQuality: 3,
			hideFromLists: true,
			imageFeatured: 'image',
		}),
		makeEntry('locations', 'geometry-hidden', {
			dateCreated: new Date(2020, 0, 2),
			entryQuality: 1,
			hideGeometry: true,
			imageFeatured: 'image',
		}),
		makeEntry('locations', 'no-image', { dateCreated: new Date(2020, 0, 1), entryQuality: 2 }),
	];
}

export function createLookupByIds<T extends CollectionKey>(entries: Array<ComputedEntry<T>>) {
	const entriesById = new Map(entries.map((entry) => [entry.id, entry] as const));

	return (ids: Array<string>) =>
		ids.map((id) => entriesById.get(id)).filter((entry) => entry !== undefined);
}
