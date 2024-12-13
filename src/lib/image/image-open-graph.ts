import sharp from 'sharp';

import type { FormatEnum, JpegOptions, PngOptions, WebpOptions } from 'sharp';

import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@/constants';
import { OPEN_GRAPH_IMAGE_DENSITY } from '@/constants';

// A basic OpenGraph image function; nothing fancy, just returns a featured image
export async function getOpenGraphImage({
	imageObject,
	targetHeight = OPEN_GRAPH_IMAGE_HEIGHT,
	targetWidth = OPEN_GRAPH_IMAGE_WIDTH,
	format,
	formatOptions,
	density = OPEN_GRAPH_IMAGE_DENSITY,
}: {
	imageObject: sharp.Sharp;
	targetHeight?: number;
	targetWidth?: number;
	format: keyof Pick<FormatEnum, 'jpg' | 'png' | 'webp'>;
	formatOptions?: JpegOptions | PngOptions | WebpOptions;
	density?: number;
}) {
	return imageObject
		.resize({
			fit: 'cover',
			height: targetHeight * density,
			width: targetWidth * density,
		})
		.toFormat(format, formatOptions)
		.toBuffer({ resolveWithObject: true });
}
