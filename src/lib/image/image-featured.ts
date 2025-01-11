import * as R from 'remeda';

import type { ContentMetadataItem } from '@/types/metadata';

import { getContentMetadataIndex } from '@/lib/metadata/metadata-index';
import { logError } from '@/lib/utils/logging';

// This should match the output of `getImageArrayItemSchema`, which we can't seem to get directly
export interface FeaturedItemBaseMetadata {
	src?: string | undefined;
	title?: string | undefined;
	contentId?: string | undefined;
}

export interface FeaturedItemMetadata extends FeaturedItemBaseMetadata {
	contentMetadata?: ContentMetadataItem;
}

// This function returns a featured image from an array of images
export function getSingleFeaturedItem({
	images,
	shuffle = false,
}: {
	images: Array<FeaturedItemBaseMetadata> | undefined;
	shuffle?: boolean;
}) {
	if (!images) return;

	return R.pipe(images, (items) => (shuffle ? R.shuffle(items) : items), R.first());
}

// Same as above but all featured items are processed (and optionally shuffled)
export async function getFeaturedItemsMetadata({
	images,
	shuffle = false,
}: {
	images: Array<FeaturedItemBaseMetadata> | undefined;
	shuffle?: boolean;
}): Promise<Array<FeaturedItemMetadata> | undefined> {
	if (!images) return undefined;

	const contentMetadataIndex = await getContentMetadataIndex();

	return R.pipe(
		images,
		R.map((item) => {
			const contentMetadata = item.contentId ? contentMetadataIndex.get(item.contentId) : undefined;

			// Throw a warning to catch typos and whatever else
			if (import.meta.env.DEV && item.contentId && contentMetadata === undefined) {
				logError(
					`Warning: requested contentId "${item.contentId}" could not be matched to any content in the system!`,
				);
			}

			return {
				...item,
				...(contentMetadata ? { contentMetadata } : {}),
			};
		}),
		(items) => (shuffle ? R.shuffle(items) : items),
	);
}

// Rather than accepting featured images directly from frontmatter this handles content metadata
export function getFeaturedItemsFromContentMetadata({
	items,
	shuffle = false,
}: {
	items: Array<ContentMetadataItem> | undefined;
	shuffle?: boolean;
}): Array<FeaturedItemMetadata> | undefined {
	if (!items || items.length === 0) return;

	return R.pipe(
		items,
		R.filter((item) => !!item.imageId),
		R.map((item) => ({
			src: item.imageId,
			title: item.title,
			contentMetadata: item,
		})),
		(items) => (shuffle ? R.shuffle(items) : items),
	);
}
