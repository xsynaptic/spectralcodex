import type { CollectionEntry } from 'astro:content';

import type {
	ContentMetadataCollectionKey,
	ContentMetadataItem,
} from '#lib/metadata/metadata-types.ts';

// Caption fields always resolve from a real item, so id/url are present (unlike a title-only caption)
export type ContentCaption = Pick<
	ContentMetadataItem,
	'title' | 'titleMultilingual' | 'id' | 'url'
>;

export interface ContentMetadataIndex {
	getById: (id: string) => ContentMetadataItem | undefined;
	getCaption: (id: string) => ContentCaption | undefined;
	backlinksOf: (id: string) => Array<ContentMetadataItem>;
	// Turn content entries into their metadata items. Throws on a missing id (unlike the lenient
	// getById) as a cross-reference integrity guard. This is the bridge from entries to items:
	// filter on entry-specific fields before resolve, on item fields after.
	resolve: <T extends ContentMetadataCollectionKey = ContentMetadataCollectionKey>(
		entries: Array<CollectionEntry<T>>,
	) => Array<ContentMetadataItem<T>>;
	byCollection: (...collections: Array<ContentMetadataCollectionKey>) => Array<ContentMetadataItem>;
	all: () => ReadonlyArray<ContentMetadataItem>;
}

export function sortContentMetadataByDate(a: ContentMetadataItem, b: ContentMetadataItem): number {
	return (b.dateUpdated ?? b.dateCreated).valueOf() - (a.dateUpdated ?? a.dateCreated).valueOf();
}

// Highest quality first, newest first on ties
export function sortContentMetadataByQuality(
	a: ContentMetadataItem,
	b: ContentMetadataItem,
): number {
	return b.entryQuality - a.entryQuality || sortContentMetadataByDate(a, b);
}

export function filterHasFeaturedImage(item: ContentMetadataItem): boolean {
	return !!item.imageId;
}

const backlinkCollections = new Set<ContentMetadataCollectionKey>(['notes', 'locations', 'posts']);
const backlinkLimit = 10;

export function createContentMetadataIndex(
	items: ReadonlyArray<ContentMetadataItem>,
): ContentMetadataIndex {
	const itemsById = new Map(items.map((item) => [item.id, item] as const));

	function getById(id: string): ContentMetadataItem | undefined {
		return itemsById.get(id);
	}

	function getCaption(id: string): ContentCaption | undefined {
		const item = itemsById.get(id);

		if (!item) return undefined;

		return {
			title: item.title,
			titleMultilingual: item.titleMultilingual,
			id: item.id,
			url: item.url,
		};
	}

	function backlinksOf(id: string): Array<ContentMetadataItem> {
		const item = itemsById.get(id);

		if (!item) return [];

		const backlinks: Array<ContentMetadataItem> = [];

		for (const backlinkId of item.backlinks) {
			const backlink = itemsById.get(backlinkId);

			if (backlink && backlinkCollections.has(backlink.collection)) {
				backlinks.push(backlink);
			}
		}

		return backlinks.sort(sortContentMetadataByDate).slice(0, backlinkLimit);
	}

	function resolve<T extends ContentMetadataCollectionKey = ContentMetadataCollectionKey>(
		entries: Array<CollectionEntry<T>>,
	): Array<ContentMetadataItem<T>> {
		return entries.map(({ id, collection }) => {
			const item = itemsById.get(id);

			if (!item) {
				throw new Error(
					`[Metadata] Content metadata for "${id}" in the "${collection}" collection was not found!`,
				);
			}
			return item as ContentMetadataItem<T>;
		});
	}

	function byCollection(
		...collections: Array<ContentMetadataCollectionKey>
	): Array<ContentMetadataItem> {
		const collectionSet = new Set(collections);

		return items.filter((item) => collectionSet.has(item.collection));
	}

	function all(): ReadonlyArray<ContentMetadataItem> {
		return items;
	}

	return { getById, getCaption, backlinksOf, resolve, byCollection, all };
}
