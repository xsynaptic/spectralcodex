import satori from 'satori';
import sharp from 'sharp';

import type { OpenGraphMetadataItem, OpenGraphSatoriOptions } from './types.js';

import { getOpenGraphElement } from './element.js';

async function getImageDataUrl({
	imageObject,
	height,
	width,
	density,
}: {
	imageObject: sharp.Sharp;
	height: number;
	width: number;
	density: number;
}) {
	const imageBuffer = await imageObject
		.resize({
			fit: 'cover',
			position: 'top',
			height: height * density,
			width: width * density,
		})
		.toBuffer({ resolveWithObject: true });

	return `data:image/${imageBuffer.info.format};base64,${imageBuffer.data.toString('base64')}`;
}

/**
 * Creates a generator function configured with fonts and dimensions
 * Call once at startup, reuse for all images (Satori best practice)
 */
export function createGenerator({
	fonts,
	density = 1,
	jpegQuality = 80,
	...satoriOptions
}: OpenGraphSatoriOptions & { jpegQuality?: number }) {
	const height = 'height' in satoriOptions ? satoriOptions.height : 630;
	const width = 'width' in satoriOptions ? satoriOptions.width : 1200;

	return async function generateOpenGraphImage(
		entry: OpenGraphMetadataItem,
		imageObject?: sharp.Sharp,
	): Promise<Buffer> {
		const imageEncoded = imageObject
			? await getImageDataUrl({
					imageObject,
					height,
					width,
					density,
				})
			: '';

		const element = getOpenGraphElement(entry, { src: imageEncoded, height, width });

		const satoriSvg = await satori(element, { ...satoriOptions, fonts });

		// Convert SVG to JPEG
		return sharp(Buffer.from(satoriSvg), { failOn: 'error' })
			.jpeg({ quality: jpegQuality })
			.toBuffer();
	};
}
