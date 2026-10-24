import type { ImageCoverPresetName } from '@spectralcodex/shared/images';

import { imagePresets } from '@spectralcodex/shared/images';

import type { ImageComponentProps, ImagePlaceholderProps } from '#lib/image/image-types.ts';

import { getImageByIdFunction, getImageSource } from '#lib/collections/images/images-data.ts';
import { ImageFitOptionEnum } from '#lib/image/image-types.ts';
import { sanitizeImageAltAttribute } from '#lib/utils/text.ts';

const fit = ImageFitOptionEnum.Cover;

interface ImageFeaturedPropsOptions {
	alt?: string;
	imageId: string | undefined;
	preset: ImageCoverPresetName;
	priority?: boolean;
	sizes: string;
	width: number;
}

export async function getImageFeaturedProps({
	alt,
	imageId,
	preset,
	priority = false,
	sizes,
	width,
}: ImageFeaturedPropsOptions) {
	const getImageById = await getImageByIdFunction();

	const imageEntry = getImageById(imageId);

	if (!imageId || !imageEntry) return { imageProps: undefined, placeholderProps: undefined };

	return {
		imageProps: {
			alt: sanitizeImageAltAttribute(alt ?? imageEntry.data.title),
			imageSource: getImageSource(imageEntry),
			preset,
			priority,
			sizes,
			width,
		} satisfies ImageComponentProps,
		placeholderProps: {
			aspectRatio: imagePresets[preset].aspectRatio,
			fit,
			highQuality: priority,
			imageId,
		} satisfies ImagePlaceholderProps,
	};
}
