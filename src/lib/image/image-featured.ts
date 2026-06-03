import type {
	ImageFeatured,
	ImageFeaturedItem,
	ImageFeaturedObject,
} from '@spectralcodex/shared/schemas';

import * as R from 'remeda';

import type {
	CatalogCaption,
	CatalogItem,
	ImageFeaturedWithCaption,
} from '#lib/catalog/catalog-types.ts';

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
	getCaption: (id: string) => CatalogCaption | undefined,
): Array<ImageFeaturedWithCaption> {
	return imageFeaturedObjects.map((item) => {
		const caption = item.link ? getCaption(item.link) : undefined;

		// Caption text prefers the image's own title; a link supplies the URL and a fallback title
		const captionTitle = item.title ?? caption?.title;

		return {
			...item,
			...(captionTitle
				? {
						caption: {
							title: captionTitle,
							titleMultilingual: caption?.titleMultilingual,
							...(caption ? { id: caption.id, url: caption.url } : {}),
						},
					}
				: {}),
		};
	});
}

// Taxonomy policy: every featured image becomes a hero (regions, themes, series)
export function getImageFeaturedGroup({
	imageFeatured,
	getCaption,
}: {
	imageFeatured: ImageFeatured | undefined;
	getCaption: (id: string) => CatalogCaption | undefined;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!imageFeatured) return undefined;

	// Normalize to array of objects
	const imageFeaturedObjectGroup: Array<ImageFeaturedObject> = Array.isArray(imageFeatured)
		? imageFeatured.map((item) => (isImageFeaturedObject(item) ? item : { id: item }))
		: [{ id: imageFeatured }];

	return enrichImageFeaturedObjects(imageFeaturedObjectGroup, getCaption);
}

// Post-like policy: heroes are opt-in via "hero: true" and authored order
export function getImageFeaturedHeroGroup({
	imageFeatured,
	getCaption,
}: {
	imageFeatured: ImageFeatured | undefined;
	getCaption: (id: string) => CatalogCaption | undefined;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!imageFeatured || !Array.isArray(imageFeatured)) return undefined;

	const imageHeroObjectGroup = imageFeatured.filter(
		(item): item is ImageFeaturedObject => isImageFeaturedObject(item) && item.hero === true,
	);

	if (imageHeroObjectGroup.length === 0) return undefined;

	return enrichImageFeaturedObjects(imageHeroObjectGroup, getCaption);
}

// Rather than accepting image featured items directly from frontmatter this handles catalog items
export function getImageFeaturedGroupByCatalog({
	items,
	shuffle = false,
}: {
	items: Array<CatalogItem> | undefined;
	shuffle?: boolean;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!items || items.length === 0) return;

	const itemsWithImages = items
		.filter((item) => !!item.imageId)
		.map((item) => ({
			id: item.imageId!,
			title: item.title,
			caption: {
				id: item.id,
				title: item.title,
				titleMultilingual: item.titleMultilingual,
				url: item.url,
			},
		}));

	return shuffle ? R.shuffle(itemsWithImages) : itemsWithImages;
}
