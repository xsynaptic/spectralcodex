import type { ContentMetadataItem } from '@/types/metadata';
import type { CollectionEntry, CollectionKey } from 'astro:content';

import { getContentMetadataIndex } from '@/lib/metadata/metadata-index';

// Provision the content metadata getter function
export async function getContentMetadataFunction() {
	const contentMetadataIndex = await getContentMetadataIndex();

	return function getContentMetadata<T extends CollectionKey = CollectionKey>(
		entries: Array<CollectionEntry<T>>,
	) {
		return entries.map(({ id, collection }) => {
			const contentMetadata = contentMetadataIndex.get(id);

			if (!contentMetadata) {
				throw new Error(
					`Content metadata for "${id}" in the "${collection}" collection was not found!`,
				);
			}
			return contentMetadata as ContentMetadataItem<T>;
		}) satisfies Array<ContentMetadataItem<T>>;
	};
}
