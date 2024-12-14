import satori from 'satori';
import sharp from 'sharp';

import type { OpenGraphMetadataItem } from './types';
import type { SatoriOptions } from 'satori';

import { getOpenGraphImageElement } from './element';

async function getOpenGraphImageDataUrl({
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

export function getGenerateOpenGraphImageFunction({
	density,
	...satoriOptions
}: { density?: number } & SatoriOptions) {
	const height = 'height' in satoriOptions ? satoriOptions.height : 600;
	const width = 'width' in satoriOptions ? satoriOptions.width : 900;

	return async function generateOpenGraphImage(
		entry: OpenGraphMetadataItem,
		imageObject?: sharp.Sharp,
	): Promise<Buffer> {
		const imageEncoded = imageObject
			? await getOpenGraphImageDataUrl({
					imageObject,
					height,
					width,
					density: density ?? 1,
				})
			: '';

		const openGraphElement = getOpenGraphImageElement(entry, { src: imageEncoded, height, width });

		const satoriSvg = await satori(openGraphElement, satoriOptions);

		return sharp(Buffer.from(satoriSvg), { failOn: 'error' }).png().toBuffer();
	};
}
