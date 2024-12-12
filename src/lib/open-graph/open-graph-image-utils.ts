import * as R from 'remeda';
import sharp from 'sharp';

import type { FormatEnum, JpegOptions, PngOptions, WebpOptions } from 'sharp';

import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@/constants';
import { OPEN_GRAPH_IMAGE_DENSITY } from '@/constants';

export const getOpenGraphImageDataUrl = async ({
	imageObject,
	targetHeight = OPEN_GRAPH_IMAGE_HEIGHT,
	targetWidth = OPEN_GRAPH_IMAGE_WIDTH,
	density = OPEN_GRAPH_IMAGE_DENSITY,
}: {
	imageObject: sharp.Sharp;
	targetHeight?: number;
	targetWidth?: number;
	density?: number;
}) =>
	R.pipe(
		await imageObject
			.resize({
				fit: 'cover',
				position: 'top',
				height: targetHeight * density,
				width: targetWidth * density,
			})
			.toBuffer({ resolveWithObject: true }),
		(placeholderBuffer) =>
			`data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString(
				'base64',
			)}`,
	);

export const getOpenGraphImageStandard = async ({
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
}) =>
	imageObject
		.resize({
			fit: 'cover',
			height: targetHeight * density,
			width: targetWidth * density,
		})
		.toFormat(format, formatOptions)
		.toBuffer({ resolveWithObject: true });
