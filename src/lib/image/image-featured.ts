import * as R from 'remeda';

import type { ContentMetadataItem } from '@/types/metadata';

import { getContentMetadataIndex } from '@/lib/metadata/metadata-index';
import { logError } from '@/lib/utils/logging';

// This should match the output of `getImageArrayItemSchema`, which we can't seem to get directly
export interface FeaturedItemBaseMetadata {
	src: {
		collection: 'images';
		id: string;
	};
	title?: string | undefined;
	contentId?: string | undefined;
}

export interface FeaturedItemMetadata extends FeaturedItemBaseMetadata {
	contentMetadata?: ContentMetadataItem;
}

// This function returns a featured image from an array of images
export const getSingleFeaturedItem = ({
	images,
	shuffle = false,
}: {
	images: FeaturedItemBaseMetadata[] | undefined;
	shuffle?: boolean;
}) => {
	if (!images) return;

	return R.pipe(images, (items) => (shuffle ? R.shuffle(items) : items), R.first());
};

// Same as above but all featured items are processed (and optionally shuffled)
export const getFeaturedItemsMetadata = async ({
	images,
	shuffle = false,
}: {
	images: FeaturedItemBaseMetadata[] | undefined;
	shuffle?: boolean;
}): Promise<FeaturedItemMetadata[] | undefined> => {
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
};

// Rather than accepting featured images directly from frontmatter this handles content metadata
export const getFeaturedItemsFromContentMetadata = ({
	items,
	shuffle = false,
}: {
	items: ContentMetadataItem[] | undefined;
	shuffle?: boolean;
}): FeaturedItemMetadata[] | undefined => {
	if (!items || items.length === 0) return;

	return R.pipe(
		items,
		R.filter((item) => !!item.imageId),
		R.map((item) => ({
			src: {
				collection: 'images' as const,
				id: item.imageId!,
			},
			title: item.title,
			contentMetadata: item,
		})),
		(items) => (shuffle ? R.shuffle(items) : items),
	);
};
