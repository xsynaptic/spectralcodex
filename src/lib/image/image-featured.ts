import type {
	ImageFeatured,
	ImageFeaturedItem,
	ImageFeaturedObject,
} from '@spectralcodex/shared/schemas';

import * as R from 'remeda';

import type {
	ContentMetadataItem,
	ImageFeaturedWithCaption,
} from '#lib/metadata/metadata-types.ts';

import { logError } from '#lib/utils/logging.ts';

// Type guard for array items
function isImageFeaturedObject(item: ImageFeaturedItem): item is ImageFeaturedObject {
	return typeof item === 'object' && 'id' in item;
}

// Get the first image featured item from a set or array
export function getImageFeaturedId({
	imageFeatured,
	shuffle = false,
}: {
	imageFeatured: ImageFeatured | undefined;
	shuffle?: boolean;
}): string | undefined {
	if (!imageFeatured) return;

	if (typeof imageFeatured === 'string') return imageFeatured;

	// Array: get first item (optionally shuffled)
	const items = shuffle ? R.shuffle(imageFeatured) : imageFeatured;

	if (!items[0]) return;

	return isImageFeaturedObject(items[0]) ? items[0].id : items[0];
}

// Get the hero image ID if explicitly marked with hero: true
export function getImageFeaturedHeroId(
	imageFeatured: ImageFeatured | undefined,
): string | undefined {
	if (!imageFeatured || !Array.isArray(imageFeatured)) return;

	const imageHero = imageFeatured.find(
		(item): item is ImageFeaturedObject => isImageFeaturedObject(item) && item.hero === true,
	);

	return imageHero?.id;
}

export function getImageFeaturedGroup({
	imageFeatured,
	contentMetadataIndex,
	shuffle = false,
}: {
	imageFeatured: ImageFeatured | undefined;
	contentMetadataIndex: Map<string, ContentMetadataItem>;
	shuffle?: boolean;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!imageFeatured) return undefined;

	// Normalize to array of objects
	const imageFeaturedObjectGroup: Array<ImageFeaturedObject> = Array.isArray(imageFeatured)
		? imageFeatured.map((item) => (isImageFeaturedObject(item) ? item : { id: item }))
		: [{ id: imageFeatured }];

	const items = imageFeaturedObjectGroup.map((item) => {
		const contentMetadata = item.link ? contentMetadataIndex.get(item.link) : undefined;

		// Throw a warning to catch typos and whatever else
		if (import.meta.env.DEV && item.link && contentMetadata === undefined) {
			logError(
				`Warning: requested link "${item.link}" could not be matched to any content in the system!`,
			);
		}

		return {
			...item,
			...(contentMetadata
				? {
						captionMetadata: {
							id: contentMetadata.id,
							title: contentMetadata.title,
							titleMultilingual: contentMetadata.titleMultilingual,
							url: contentMetadata.url,
						},
					}
				: {}),
		};
	});

	return shuffle ? R.shuffle(items) : items;
}

// Rather than accepting image set items directly from frontmatter this handles content metadata items
export function getImageFeaturedGroupByContentMetadata({
	items,
	shuffle = false,
}: {
	items: Array<ContentMetadataItem> | undefined;
	shuffle?: boolean;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!items || items.length === 0) return;

	const itemsWithImages = items
		.filter((item) => !!item.imageId)
		.map((item) => ({
			id: item.imageId!,
			title: item.title,
			captionMetadata: {
				id: item.id,
				title: item.title,
				titleMultilingual: item.titleMultilingual,
				url: item.url,
			},
		}));

	return shuffle ? R.shuffle(itemsWithImages) : itemsWithImages;
}
