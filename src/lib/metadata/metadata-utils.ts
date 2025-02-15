import slugify from '@sindresorhus/slugify';

import type { ContentMetadataItem } from '@/types/metadata';
import type { CollectionKey } from 'astro:content';

import { FEATURE_SHORTCODES_ERROR_LOG } from '@/constants';
import { getContentMetadataIndex } from '@/lib/metadata/metadata-index';
import { logError } from '@/lib/utils/logging';

export async function getContentMetadataById(id: string | undefined) {
	const contentMetadataIndex = await getContentMetadataIndex();

	const slug = slugify(id ?? `test-${String(Math.random())}`);

	const contentMetadata = contentMetadataIndex.get(slug);

	if (!contentMetadata && FEATURE_SHORTCODES_ERROR_LOG) {
		logError(`Missing content metadata specified in shortcode: "${slug}"`);
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
	return b.date.valueOf() - a.date.valueOf();
}
