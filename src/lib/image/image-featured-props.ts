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
	alt,
	imageFormat,
	imageId,
	imageQuality,
	priority = false,
	sizes,
	width,
	widths,
}: ImageFeaturedPropsOptions) {
	const getImageById = await getImageByIdFunction();

	const imageEntry = getImageById(imageId);

	if (!imageId || !imageEntry) return { imageProps: undefined, placeholderProps: undefined };

	return {
		imageProps: {
			alt: sanitizeImageAltAttribute(alt ?? imageEntry.data.title),
			breakpoints: getImageBreakpoints({
				maxWidth: imageEntry.data.width,
				...(widths ? { widths } : {}),
			}),
			height: Math.round(width / aspectRatio),
			imageFormat,
			imageQuality,
			operations: { fit },
			priority,
			sizes,
			src: imageId,
			unstyled: true,
			width,
		} satisfies ImageComponentProps,
		placeholderProps: {
			aspectRatio,
			fit,
			highQuality: priority,
			imageId,
		} satisfies ImagePlaceholderProps,
	};
}
