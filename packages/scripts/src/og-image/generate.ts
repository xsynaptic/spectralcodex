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
	isFallback,
}: {
	imageObject: sharp.Sharp;
	height: number;
	width: number;
	isFallback: boolean;
}): Promise<{
	dataUrl: string;
	luminanceTop: number;
	luminanceBottom: number;
}> {
	const imagePipeline = imageObject.resize({
		fit: 'cover',
		position: 'top',
		height,
		width,
	});

	if (isFallback) {
		imagePipeline.blur(16);
	}

	const imageBuffer = await imagePipeline.toBuffer({ resolveWithObject: true });

	// Analyze luminance zones (10%-20% for top, 70%-90% for bottom)
	const [luminanceTop, luminanceBottom] = await Promise.all([
		getZoneLuminance(imageBuffer.data, height, width, 0.1, 0.2),
		getZoneLuminance(imageBuffer.data, height, width, 0.7, 0.9),
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
	jpegQuality = 90,
	...satoriOptions
}: SatoriOptions & { jpegQuality?: number }) {
	const height = 'height' in satoriOptions ? satoriOptions.height : OPEN_GRAPH_IMAGE_HEIGHT;
	const width = 'width' in satoriOptions ? satoriOptions.width : OPEN_GRAPH_IMAGE_WIDTH;

	// Cache processed image data since source imagery is sometimes reused
	const processedImageCache = new Map<
		string,
		{ dataUrl: string; luminanceTop: number; luminanceBottom: number }
	>();

	return async function generateOpenGraphImage({
		entry,
		imageId,
		imageObject,
	}: {
		entry: OpenGraphMetadataItem;
		imageId?: string;
		imageObject?: sharp.Sharp | undefined;
	}): Promise<Buffer> {
		let processed: { dataUrl: string; luminanceTop: number; luminanceBottom: number } | undefined;

		if (imageObject) {
			const cacheKey = imageId ? `${imageId}:${String(entry.isFallback)}` : undefined;
			const cached = cacheKey ? processedImageCache.get(cacheKey) : undefined;

			if (cached) {
				processed = cached;
			} else {
				processed = await processImage({
					imageObject,
					height,
					width,
					isFallback: entry.isFallback,
				});
				if (cacheKey) {
					processedImageCache.set(cacheKey, processed);
				}
			}
		}

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
