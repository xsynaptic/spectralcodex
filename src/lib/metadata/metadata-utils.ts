import type { CollectionEntry } from 'astro:content';

import type {
	ContentMetadataCollectionKey,
	ContentMetadataItem,
} from '#lib/metadata/metadata-types.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';

// Provision the content metadata getter function
export async function createContentMetadataFunction(): Promise<
	<T extends ContentMetadataCollectionKey = ContentMetadataCollectionKey>(
		entries: Array<CollectionEntry<T>>,
	) => Array<ContentMetadataItem<T>>
> {
	const contentMetadataIndex = await getContentMetadataIndex();

	return function getContentMetadata<
		T extends ContentMetadataCollectionKey = ContentMetadataCollectionKey,
	>(entries: Array<CollectionEntry<T>>): Array<ContentMetadataItem<T>> {
		return entries.map(({ id, collection }) => {
			const contentMetadata = contentMetadataIndex.get(id);

			if (!contentMetadata) {
				throw new Error(
					`[Metadata] Content metadata for "${id}" in the "${collection}" collection was not found!`,
				);
			}
			return contentMetadata as ContentMetadataItem<T>;
		});
	};
}

export async function getContentMetadataById(id: string): Promise<ContentMetadataItem | undefined> {
	const contentMetadataIndex = await getContentMetadataIndex();

	return contentMetadataIndex.get(id);
}

// Filter content metadata by featured images
export function filterHasFeaturedImage<
	T extends ContentMetadataCollectionKey = ContentMetadataCollectionKey,
>(item: ContentMetadataItem<T>) {
	return !!item.imageId;
}

// Sort content metadata; reverse chronological order (by dateUpdated, falling back to dateCreated)
export function sortContentMetadataByDate(a: ContentMetadataItem, b: ContentMetadataItem) {
	const dateA = a.dateUpdated ?? a.dateCreated;
	const dateB = b.dateUpdated ?? b.dateCreated;

	return dateB.valueOf() - dateA.valueOf();
}
