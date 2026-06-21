import type { Font } from 'satori';

import {
	analyzeLuminance,
	createOgRenderer,
	encodeDataUrl,
	resizeCover,
} from '@xsynaptic/og-image-generator';

import type { OpenGraphMetadataItem } from './types.js';

import { getOpenGraphElement } from './element.js';

async function processImage({
	imageInput,
	height,
	width,
	isFallback,
}: {
	imageInput: string;
	height: number;
	width: number;
	isFallback: boolean;
}): Promise<{
	dataUrl: string;
	luminanceTop: number;
	luminanceBottom: number;
}> {
	const pipeline = resizeCover(imageInput, { height, position: 'top', width });

	if (isFallback) {
		pipeline.blur(16);
	}

	const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

	// Analyze luminance zones (10%-20% for top, 70%-90% for bottom)
	const [luminanceTop = 0, luminanceBottom = 0] = await analyzeLuminance(data, [
		[0.1, 0.2],
		[0.7, 0.9],
	]);

	const dataUrl = encodeDataUrl(data, info.format === 'png' ? 'png' : 'jpeg');

	return { dataUrl, luminanceTop, luminanceBottom };
}

/**
 * Creates a generator function configured with fonts and dimensions
 * Call once at startup, reuse for all images (Satori best practice)
 */
export function createGenerator({
	fonts,
	width,
	height,
	jpegQuality = 90,
}: {
	fonts: Array<Font>;
	width: number;
	height: number;
	jpegQuality?: number;
}) {
	const render = createOgRenderer({ fonts, format: 'jpeg', height, quality: jpegQuality, width });

	// Cache processed image data since source imagery is sometimes reused
	const processedImageCache = new Map<
		string,
		{ dataUrl: string; luminanceTop: number; luminanceBottom: number }
	>();

	return async function generateOpenGraphImage({
		entry,
		imageId,
		imageInput,
	}: {
		entry: OpenGraphMetadataItem;
		imageId?: string;
		imageInput?: string | undefined;
	}): Promise<Buffer> {
		let processed: { dataUrl: string; luminanceTop: number; luminanceBottom: number } | undefined;

		if (imageInput) {
			const cacheKey = imageId ? `${imageId}:${String(entry.isFallback)}` : undefined;
			const cached = cacheKey ? processedImageCache.get(cacheKey) : undefined;

			if (cached) {
				processed = cached;
			} else {
				processed = await processImage({
					imageInput,
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

		return render(element);
	};
}
