import sharp from 'sharp';

import { IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ, IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ } from '#constants.ts';
import { getImageObject } from '#lib/image/image-file-handling.ts';

// Math to convert image dimensions into a constrained version for use with the placeholders
// Note: `pixelCount` is the overall number of pixels in the placeholder
export function getImagePlaceholderDimensions({
	width,
	height,
	pixelCount,
}: {
	width: number;
	height: number;
	pixelCount: number;
}): { width: number; height: number } {
	const aspectRatio = width / height;
	const heightTarget = Math.sqrt(pixelCount / aspectRatio);
	const widthTarget = pixelCount / heightTarget;

	return { width: Math.round(widthTarget), height: Math.round(heightTarget) };
}

/**
 * Low-quality image placeholder (LQIP) code originally adapted from Erika Florist
 * @link https://github.com/Princesseuh/erika.florist/blob/main/src%2FimageService.ts
 */
export async function getImagePlaceholderDataUrl({
	imageObject,
	pixelCount = IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
}: {
	imageObject: sharp.Sharp;
	pixelCount?: number;
}) {
	const metadata = await imageObject.metadata();

	if (!metadata.height || !metadata.width) return;

	const placeholderDimensions = getImagePlaceholderDimensions({
		width: metadata.width,
		height: metadata.height,
		pixelCount,
	});

	const placeholderBuffer = await imageObject
		.resize(placeholderDimensions.width, placeholderDimensions.height, { fit: 'inside' })
		.toFormat('webp', { quality: 10 })
		.modulate({
			brightness: 1,
			saturation: 1.2,
		})
		.toBuffer({ resolveWithObject: true });

	return `data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString(
		'base64',
	)}`;
}

// Hero images need larger placeholders but we can generate these on-demand
export async function getImagePlaceholderDataUrlHq(src: string) {
	const imageObject = await getImageObject(src);

	return await getImagePlaceholderDataUrl({
		imageObject,
		pixelCount: IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ,
	});
}
