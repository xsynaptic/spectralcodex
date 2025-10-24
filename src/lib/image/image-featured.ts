import * as R from 'remeda';
import { z } from 'zod';

import type { ContentMetadataItem } from '#lib/metadata/metadata-types.ts';

import { getContentMetadataIndex } from '#lib/metadata/metadata-index.ts';
import { logError } from '#lib/utils/logging.ts';

// Image featured schemas
const ImageFeaturedObjectSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	link: z.string().optional(), // Functions just like a Link component in MDX content
	hero: z.boolean().optional(),
});

type ImageFeaturedObject = z.infer<typeof ImageFeaturedObjectSchema>;

export const ImageFeaturedSchema = z.union([
	z.string(),
	z.string().array(),
	ImageFeaturedObjectSchema,
	ImageFeaturedObjectSchema.array(),
]);

type ImageFeatured = z.infer<typeof ImageFeaturedSchema>;

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

// Image featured data is sometimes displayed with a caption
export type ImageFeaturedCaptionMetadata = Pick<
	ContentMetadataItem,
	'title' | 'titleMultilingual' | 'url'
>;

export type ImageFeaturedObjectWithCaptionMetadata = ImageFeaturedObject & {
	captionMetadata?: ImageFeaturedCaptionMetadata | undefined;
};

export async function getImageFeaturedObjectGroup({
	imageFeatured,
	shuffle = false,
}: {
	imageFeatured: ImageFeatured | undefined;
	shuffle?: boolean;
}): Promise<Array<ImageFeaturedObjectWithCaptionMetadata> | undefined> {
	if (!imageFeatured) return undefined;

	const contentMetadataIndex = await getContentMetadataIndex();

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

// Rather than accepting image set items directly from frontmatter this handles content metadata
export function getImageFeaturedObjectWithCaptionMetadataGroup({
	items,
	shuffle = false,
}: {
	items: Array<ContentMetadataItem> | undefined;
	shuffle?: boolean;
}): Array<ImageFeaturedObjectWithCaptionMetadata> | undefined {
	if (!items || items.length === 0) return;

	const itemsWithImages = items
		.filter((item) => !!item.imageId)
		.map((item) => ({
			id: item.imageId!,
			title: item.title,
			captionMetadata: {
				title: item.title,
				titleMultilingual: item.titleMultilingual,
				url: item.url,
			},
		}));

	return shuffle ? R.shuffle(itemsWithImages) : itemsWithImages;
}
