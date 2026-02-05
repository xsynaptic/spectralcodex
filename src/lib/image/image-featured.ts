import type { ImageFeatured, ImageFeaturedObject } from '@spectralcodex/shared/schemas';

import * as R from 'remeda';

import type {
	ContentMetadataItem,
	ImageFeaturedWithCaption,
} from '#lib/metadata/metadata-types.ts';

import { logError } from '#lib/utils/logging.ts';

// A simple type guard to help maintain type safety
function isImageFeaturedObject(imageFeatured: ImageFeatured): imageFeatured is ImageFeaturedObject {
	return typeof imageFeatured === 'object' && 'id' in imageFeatured;
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

	if (Array.isArray(imageFeatured)) {
		const primaryImageFeatured = shuffle ? R.shuffle(imageFeatured)[0] : imageFeatured[0];

		return getImageFeaturedId({ imageFeatured: primaryImageFeatured, shuffle });
	}

	if (isImageFeaturedObject(imageFeatured)) {
		return imageFeatured.id;
	}

	return imageFeatured;
}

// Get the hero image ID with optional fallback
export function getImageHeroId({
	imageFeatured,
	shuffle = false,
	fallback = false,
}: {
	imageFeatured: ImageFeatured | undefined;
	shuffle?: boolean;
	fallback?: boolean;
}) {
	if (!imageFeatured) return;

	if (Array.isArray(imageFeatured)) {
		const imageHero = imageFeatured.find(
			(item): item is ImageFeaturedObject => isImageFeaturedObject(item) && item.hero === true,
		);

		if (imageHero) {
			return imageHero.id;
		}
	}

	if (isImageFeaturedObject(imageFeatured) && imageFeatured.hero === true) {
		return imageFeatured.id;
	}

	return fallback ? getImageFeaturedId({ imageFeatured, shuffle }) : undefined;
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

	const imageFeaturedObjectGroup: Array<ImageFeaturedObject> = [];

	if (Array.isArray(imageFeatured)) {
		for (const imageFeaturedItem of imageFeatured) {
			imageFeaturedObjectGroup.push(
				isImageFeaturedObject(imageFeaturedItem) ? imageFeaturedItem : { id: imageFeaturedItem },
			);
		}
	} else {
		imageFeaturedObjectGroup.push(
			isImageFeaturedObject(imageFeatured) ? imageFeatured : { id: imageFeatured },
		);
	}

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
