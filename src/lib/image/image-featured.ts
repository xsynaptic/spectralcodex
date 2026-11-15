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

// Taxonomy policy: every featured image becomes a hero (regions, themes, series)
export function getImageFeaturedGroup({
	getCaption,
	imageFeatured,
}: {
	getCaption: (id: string) => CatalogCaption | undefined;
	imageFeatured: ImageFeatured | undefined;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!imageFeatured) return undefined;

	return enrichImageFeaturedObjects(getImageFeaturedObjects(imageFeatured), getCaption);
}

// Rather than accepting image featured items directly from frontmatter this handles catalog items
export function getImageFeaturedGroupByCatalog({
	hero = false,
	items,
	shuffle = false,
}: {
	hero?: boolean;
	items: Array<CatalogItem> | undefined;
	shuffle?: boolean;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!items || items.length === 0) return;

	const itemsWithImages = items.flatMap((item) => {
		const id = hero ? item.imageHeroId : item.imageId;

		if (!id) return [];

		return [
			{
				caption: {
					id: item.id,
					title: item.title,
					titleMultilingual: item.titleMultilingual,
					url: item.url,
				},
				id,
				title: item.title,
			},
		];
	});

	return shuffle ? R.shuffle(itemsWithImages) : itemsWithImages;
}

// Post-like policy: heroes are opt-in via "hero: true" and authored order
export function getImageFeaturedHeroGroup({
	getCaption,
	imageFeatured,
}: {
	getCaption: (id: string) => CatalogCaption | undefined;
	imageFeatured: ImageFeatured | undefined;
}): Array<ImageFeaturedWithCaption> | undefined {
	if (!imageFeatured || !Array.isArray(imageFeatured)) return undefined;

	const imageHeroObjectGroup = imageFeatured.filter(isImageHeroObject);

	if (imageHeroObjectGroup.length === 0) return undefined;

	return enrichImageFeaturedObjects(imageHeroObjectGroup, getCaption);
}

export function getImageFeaturedIds(imageFeatured: ImageFeatured | undefined) {
	return getImageFeaturedObjects(imageFeatured).map((item) => item.id);
}

// Get the first image featured item from a set or array
export function getImageFeaturedId({
	imageFeatured,
	shuffle = false,
}: {
	imageFeatured: ImageFeatured | undefined;
	shuffle?: boolean;
}): string | undefined {
	const ids = getImageFeaturedIds(imageFeatured);

	return shuffle ? R.sample(ids, 1)[0] : ids[0];
}

// The hero-flagged image is not necessarily the first featured image
export function getImageHeroId({
	imageFeatured,
}: {
	imageFeatured: ImageFeatured | undefined;
}): string | undefined {
	if (!imageFeatured || !Array.isArray(imageFeatured)) return;

	return imageFeatured.find(isImageHeroObject)?.id;
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

function getImageFeaturedObjects(
	imageFeatured: ImageFeatured | undefined,
): Array<ImageFeaturedObject> {
	if (!imageFeatured) return [];

	if (typeof imageFeatured === 'string') return [{ id: imageFeatured }];

	return imageFeatured.map((item) => (isImageFeaturedObject(item) ? item : { id: item }));
}

// Type guard for array items
function isImageFeaturedObject(item: ImageFeaturedItem): item is ImageFeaturedObject {
	return typeof item === 'object' && 'id' in item;
}

function isImageHeroObject(item: ImageFeaturedItem): item is ImageFeaturedObject {
	return isImageFeaturedObject(item) && item.hero === true;
}
