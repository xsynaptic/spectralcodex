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

function enrichImageFeaturedObjects(
	imageFeaturedObjects: Array<ImageFeaturedObject>,
	contentMetadataIndex: Map<string, ContentMetadataItem>,
): Array<ImageFeaturedWithCaption> {
	return imageFeaturedObjects.map((item) => {
		const contentMetadata = item.link ? contentMetadataIndex.get(item.link) : undefined;

		// Caption text prefers the image's own title; a link supplies the URL and a fallback title
		const captionTitle = item.title ?? contentMetadata?.title;

		return {
			...item,
			...(captionTitle
				? {
						captionMetadata: {
							title: captionTitle,
							titleMultilingual: contentMetadata?.titleMultilingual,
							...(contentMetadata ? { id: contentMetadata.id, url: contentMetadata.url } : {}),
						},
					}
				: {}),
		};
	});
}

// Taxonomy policy: every featured image becomes a hero (regions, themes, series)
export function getImageFeaturedGroup({
	imageFeatured,
	contentMetadataIndex,
}: {
	imageFeatured: ImageFeatured | undefined;
	contentMetadataIndex: Map<string, ContentMetadataItem>;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!imageFeatured) return undefined;

	// Normalize to array of objects
	const imageFeaturedObjectGroup: Array<ImageFeaturedObject> = Array.isArray(imageFeatured)
		? imageFeatured.map((item) => (isImageFeaturedObject(item) ? item : { id: item }))
		: [{ id: imageFeatured }];

	return enrichImageFeaturedObjects(imageFeaturedObjectGroup, contentMetadataIndex);
}

// Post-like policy: heroes are opt-in via "hero: true" and authored order
export function getImageFeaturedHeroGroup({
	imageFeatured,
	contentMetadataIndex,
}: {
	imageFeatured: ImageFeatured | undefined;
	contentMetadataIndex: Map<string, ContentMetadataItem>;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!imageFeatured || !Array.isArray(imageFeatured)) return undefined;

	const imageHeroObjectGroup = imageFeatured.filter(
		(item): item is ImageFeaturedObject => isImageFeaturedObject(item) && item.hero === true,
	);

	if (imageHeroObjectGroup.length === 0) return undefined;

	return enrichImageFeaturedObjects(imageHeroObjectGroup, contentMetadataIndex);
}

// Rather than accepting image featured items directly from frontmatter this handles content metadata items
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
