import type { ImageCoverPresetName } from '@spectralcodex/shared/images';

import { getImagePresetSize } from '@spectralcodex/shared/images';

import type { ImageComponentProps, ImagePlaceholderProps } from '#lib/image/image-types.ts';

import { getImageByIdFunction, getImageSource } from '#lib/collections/images/images-data.ts';
import { sanitizeImageAltAttribute } from '#lib/utils/text.ts';

const priorityPlaceholderPixels = 1600;

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

	const imageSource = getImageSource(imageEntry);
	const size = getImagePresetSize(preset, width, imageSource);

	return {
		imageProps: {
			alt: sanitizeImageAltAttribute(alt ?? imageEntry.data.title),
			imageSource,
			preset,
			priority,
			sizes,
			width,
		} satisfies ImageComponentProps,
		placeholderProps: {
			imageId,
			request: priority ? { pixels: priorityPlaceholderPixels, size } : { size },
		} satisfies ImagePlaceholderProps,
	};
}
