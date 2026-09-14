import type { ImageFormat } from 'unpic';

import type { ImageComponentProps, ImagePlaceholderProps } from '#lib/image/image-types.ts';

import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import { getImageBreakpoints } from '#lib/image/image-layout.ts';
import { ImageFitOptionEnum } from '#lib/image/image-types.ts';
import { sanitizeImageAltAttribute } from '#lib/utils/text.ts';

const aspectRatio = 3 / 2;
const fit = ImageFitOptionEnum.Cover;

interface ImageFeaturedPropsOptions {
	alt?: string;
	imageFormat: ImageFormat;
	imageId: string | undefined;
	imageQuality: number;
	priority?: boolean;
	sizes: string;
	width: number;
	widths?: Array<number>;
}

export async function getImageFeaturedProps({
	imageId,
	alt,
	widths,
	sizes,
	width,
	imageQuality,
	imageFormat,
	priority = false,
}: ImageFeaturedPropsOptions) {
	const getImageById = await getImageByIdFunction();

	const imageEntry = getImageById(imageId);

	if (!imageId || !imageEntry) return { imageProps: undefined, placeholderProps: undefined };

	return {
		imageProps: {
			src: imageId,
			breakpoints: getImageBreakpoints({
				maxWidth: imageEntry.data.width,
				...(widths ? { widths } : {}),
			}),
			sizes,
			width,
			height: Math.round(width / aspectRatio),
			alt: sanitizeImageAltAttribute(alt ?? imageEntry.data.title),
			unstyled: true,
			operations: { fit },
			imageQuality,
			imageFormat,
			priority,
		} satisfies ImageComponentProps,
		placeholderProps: {
			imageId,
			aspectRatio,
			fit,
			highQuality: priority,
		} satisfies ImagePlaceholderProps,
	};
}
