import type { CollectionEntry } from 'astro:content';

import type {
	CatalogCaption,
	CatalogCollectionKey,
	CatalogItem,
} from '#lib/catalog/catalog-types.ts';

import { sortCatalogByDate } from '#lib/catalog/catalog-utils.ts';

export interface Catalog {
	getById: (id: string) => CatalogItem | undefined;
	getCaption: (id: string) => CatalogCaption | undefined;
	backlinksOf: (id: string) => Array<CatalogItem>;
	resolve: <T extends CatalogCollectionKey = CatalogCollectionKey>(
		entries: Array<CollectionEntry<T>>,
	) => Array<CatalogItem<T>>;
	byCollection: (...collections: Array<CatalogCollectionKey>) => Array<CatalogItem>;
	all: () => ReadonlyArray<CatalogItem>;
}

const backlinkCollections = new Set<CatalogCollectionKey>(['notes', 'locations', 'posts']);
const backlinkLimit = 10;

export function createCatalog(items: ReadonlyArray<CatalogItem>): Catalog {
	const itemsById = new Map(items.map((item) => [item.id, item] as const));

	function getById(id: string): CatalogItem | undefined {
		return itemsById.get(id);
	}

	function getCaption(id: string): CatalogCaption | undefined {
		const item = itemsById.get(id);

		if (!item) return undefined;

		return {
			title: item.title,
			titleMultilingual: item.titleMultilingual,
			id: item.id,
			url: item.url,
		};
	}

	function backlinksOf(id: string): Array<CatalogItem> {
		const item = itemsById.get(id);

		if (!item) return [];

		const backlinks: Array<CatalogItem> = [];

		for (const backlinkId of item.backlinks) {
			const backlink = itemsById.get(backlinkId);

			if (backlink && backlinkCollections.has(backlink.collection)) {
				backlinks.push(backlink);
			}
		}

		return backlinks.sort(sortCatalogByDate).slice(0, backlinkLimit);
	}

	function resolve<T extends CatalogCollectionKey = CatalogCollectionKey>(
		entries: Array<CollectionEntry<T>>,
	): Array<CatalogItem<T>> {
		return entries.map(({ id, collection }) => {
			const item = itemsById.get(id);

			if (!item) {
				throw new Error(
					`[Catalog] Catalog item for "${id}" in the "${collection}" collection was not found!`,
				);
			}
			return item as CatalogItem<T>;
		});
	}

	function byCollection(...collections: Array<CatalogCollectionKey>): Array<CatalogItem> {
		const collectionSet = new Set(collections);

		return items.filter((item) => collectionSet.has(item.collection));
	}

	function all(): ReadonlyArray<CatalogItem> {
		return items;
	}

	return { getById, getCaption, backlinksOf, resolve, byCollection, all };
}
