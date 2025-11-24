import type { CollectionKey } from 'astro:content';

import slugify from '@sindresorhus/slugify';

import type { ContentMetadataItem } from '#lib/types/index.ts';

import { CONTENT_LINKS_MISSING_ID_LOG } from '#constants.ts';
import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { logError } from '#lib/utils/logging.ts';

export async function getContentMetadataById(id: string) {
	const contentMetadataIndex = await getContentMetadataIndex();

	const slug = slugify(id);

	const contentMetadata = contentMetadataIndex.get(slug);

	if (!contentMetadata && CONTENT_LINKS_MISSING_ID_LOG) {
		logError(`[Metadata] Missing content specified in Link component: "${slug}"`);
	}
	return contentMetadata;
}

// Filter content metadata by featured images
export function filterHasFeaturedImage<T extends CollectionKey = CollectionKey>(
	item: ContentMetadataItem<T>,
) {
	return !!item.imageId;
}

// Sort content metadata; reverse chronological order
export function sortContentMetadataByDate(a: ContentMetadataItem, b: ContentMetadataItem) {
	return b.dateCreated.valueOf() - a.dateCreated.valueOf();
}
