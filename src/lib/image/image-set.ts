import * as R from 'remeda';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';
import type { ImageSet } from '#lib/schemas/image.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { logError } from '#lib/utils/logging.ts';

export type ImageSetWithMetadata = ImageSet & {
	contentMetadata?: ContentMetadataItem;
};

export function getImageSetPrimaryImage({
	imageSet,
	shuffle = false,
}: {
	imageSet: Array<ImageSet> | undefined;
	shuffle?: boolean;
}) {
	if (!imageSet) return;

	const items = shuffle ? R.shuffle(imageSet) : imageSet;

	return R.first(items);
}

// Same as above but all image set items are processed (and optionally shuffled)
export async function getImageSetMetadata({
	imageSet,
	shuffle = false,
}: {
	imageSet: Array<ImageSet> | undefined;
	shuffle?: boolean;
}): Promise<Array<ImageSetWithMetadata> | undefined> {
	if (!imageSet) return undefined;

	const contentMetadataIndex = await getContentMetadataIndex();

	const items = imageSet.map((item) => {
		const contentMetadata = item.link ? contentMetadataIndex.get(item.link) : undefined;

		// Throw a warning to catch typos and whatever else
		if (import.meta.env.DEV && item.link && contentMetadata === undefined) {
			logError(
				`Warning: requested link "${item.link}" could not be matched to any content in the system!`,
			);
		}

		return {
			...item,
			...(contentMetadata ? { contentMetadata } : {}),
		};
	});

	return shuffle ? R.shuffle(items) : items;
}

// Rather than accepting image set items directly from frontmatter this handles content metadata
export function getImageSetFromContentMetadata({
	items,
	shuffle = false,
}: {
	items: Array<ContentMetadataItem> | undefined;
	shuffle?: boolean;
}): Array<ImageSetWithMetadata> | undefined {
	if (!items || items.length === 0) return;

	const itemsWithImages = items
		.filter((item) => !!item.imageId)
		.map((item) => ({
			id: item.imageId!,
			title: item.title,
			contentMetadata: item,
		}));

	return shuffle ? R.shuffle(itemsWithImages) : itemsWithImages;
}
