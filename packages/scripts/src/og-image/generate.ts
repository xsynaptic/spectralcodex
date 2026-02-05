import type { SatoriOptions } from 'satori';

import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@spectralcodex/shared/constants';
import satori from 'satori';
import sharp from 'sharp';

import type { OpenGraphMetadataItem } from './types.js';

import { getOpenGraphElement } from './element.js';

/**
 * Analyze luminance of a horizontal band within an image
 * Returns perceived brightness (0-255) using standard luminance formula
 */
async function getZoneLuminance(
	imageBuffer: Buffer,
	fullHeight: number,
	fullWidth: number,
	startPercent: number,
	endPercent: number,
): Promise<number> {
	const topOffset = Math.floor(fullHeight * startPercent);
	const zoneHeight = Math.floor(fullHeight * (endPercent - startPercent));

	// Extract to buffer first; chaining extract().stats() doesn't work correctly
	const extractedBuffer = await sharp(imageBuffer)
		.extract({ left: 0, top: topOffset, width: fullWidth, height: zoneHeight })
		.toBuffer();

	const { channels } = await sharp(extractedBuffer).stats();

	const r = channels[0]?.mean ?? 0;
	const g = channels[1]?.mean ?? 0;
	const b = channels[2]?.mean ?? 0;

	// Perceived luminance formula (ITU-R BT.601)
	return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

async function processImage({
	imageObject,
	height,
	width,
	density,
}: {
	imageObject: sharp.Sharp;
	height: number;
	width: number;
	density: number;
}): Promise<{
	dataUrl: string;
	luminanceTop: number;
	luminanceBottom: number;
}> {
	const scaledHeight = height * density;
	const scaledWidth = width * density;

	const imageBuffer = await imageObject
		.resize({
			fit: 'cover',
			position: 'top',
			height: scaledHeight,
			width: scaledWidth,
		})
		.toBuffer({ resolveWithObject: true });

	// Analyze luminance zones (10%-20% for top, 70%-90% for bottom)
	const [luminanceTop, luminanceBottom] = await Promise.all([
		getZoneLuminance(imageBuffer.data, scaledHeight, scaledWidth, 0.1, 0.2),
		getZoneLuminance(imageBuffer.data, scaledHeight, scaledWidth, 0.7, 0.9),
	]);

	const dataUrl = `data:image/${imageBuffer.info.format};base64,${imageBuffer.data.toString('base64')}`;

	return { dataUrl, luminanceTop, luminanceBottom };
}

/**
 * Creates a generator function configured with fonts and dimensions
 * Call once at startup, reuse for all images (Satori best practice)
 */
export function createGenerator({
	fonts,
	density = 1,
	jpegQuality = 90,
	...satoriOptions
}: SatoriOptions & { density?: number; jpegQuality?: number }) {
	const height = 'height' in satoriOptions ? satoriOptions.height : OPEN_GRAPH_IMAGE_HEIGHT;
	const width = 'width' in satoriOptions ? satoriOptions.width : OPEN_GRAPH_IMAGE_WIDTH;

	return async function generateOpenGraphImage(
		entry: OpenGraphMetadataItem,
		imageObject?: sharp.Sharp,
	): Promise<Buffer> {
		const processed = imageObject
			? await processImage({ imageObject, height, width, density })
			: undefined;

		const element = getOpenGraphElement(entry, {
			src: processed?.dataUrl ?? '',
			height,
			width,
			luminanceTop: processed?.luminanceTop,
			luminanceBottom: processed?.luminanceBottom,
		});

		const satoriSvg = await satori(element, { ...satoriOptions, fonts });

		// Convert SVG to JPEG
		return sharp(Buffer.from(satoriSvg), { failOn: 'error' })
			.jpeg({ quality: jpegQuality })
			.toBuffer();
	};
}
