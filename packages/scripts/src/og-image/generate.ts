import type { Font } from 'takumi-js';

import sharp from 'sharp';
import { render, setGlyphCacheMaxBytes } from 'takumi-js';
import { Renderer } from 'takumi-js/node';

import type { OpenGraphMetadataItem } from './types.js';

import { getOpenGraphElement } from './element.js';

// A CJK outline runs a few kilobytes, so the 8 MiB default evicts glyphs mid-run
const GLYPH_CACHE_BYTES = 64 * 1024 * 1024;

// A vertical band as [start, end] fractions of the height
type LuminanceZone = [start: number, end: number];

export interface ProcessedImage {
	data: Buffer;
	height: number;
	width: number;
	// Mean perceived luminance of the top zone, 0-255
	luminanceTop: number;
	// Mean perceived luminance of the bottom zone, 0-255
	luminanceBottom: number;
}

// Samples every 16th pixel; the result only picks a text treatment, so precision is not the point
function zoneLuminance(
	pixels: Buffer,
	width: number,
	height: number,
	[start, end]: LuminanceZone,
): number {
	const from = Math.floor(height * start) * width * 4;
	const to = Math.floor(height * end) * width * 4;

	let total = 0;
	let count = 0;

	for (let index = from; index < to; index += 4 * 16) {
		total +=
			0.299 * (pixels[index] ?? 0) +
			0.587 * (pixels[index + 1] ?? 0) +
			0.114 * (pixels[index + 2] ?? 0);
		count++;
	}

	return count > 0 ? Math.round(total / count) : 0;
}

// Raw RGBA hands off to Takumi without an encode, and luminance reads the same buffer
export async function processImage({
	imageInput,
	height,
	width,
	isFallback,
}: {
	imageInput: string;
	height: number;
	width: number;
	isFallback: boolean;
}): Promise<ProcessedImage> {
	const pipeline = sharp(imageInput).resize({ fit: 'cover', height, position: 'top', width });

	if (isFallback) {
		pipeline.blur(16);
	}

	const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

	return {
		data,
		height: info.height,
		width: info.width,
		luminanceTop: zoneLuminance(data, info.width, info.height, [0.1, 0.2]),
		luminanceBottom: zoneLuminance(data, info.width, info.height, [0.7, 0.9]),
	};
}

// Fonts and glyph outlines live on the renderer, so build one and reuse it for every card
export function createRenderer({
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
	// Read when a cache is first used, so this has to run before the first render
	setGlyphCacheMaxBytes(GLYPH_CACHE_BYTES);

	const renderer = new Renderer();

	return async function renderOpenGraphImage(
		entry: OpenGraphMetadataItem,
		image?: ProcessedImage,
	): Promise<Uint8Array> {
		return render(getOpenGraphElement(entry, image), {
			format: 'jpeg',
			fonts,
			height,
			quality: jpegQuality,
			renderer,
			width,
		});
	};
}
