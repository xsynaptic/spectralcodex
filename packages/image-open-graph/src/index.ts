import satori from 'satori';
import sharp from 'sharp';

import type { ContentMetadataItem } from '@/types/metadata';
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
	const placeholderBuffer = await imageObject
		.resize({
			fit: 'cover',
			position: 'top',
			height: height * density,
			width: width * density,
		})
		.toBuffer({ resolveWithObject: true });

	return `data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString(
		'base64',
	)}`;
}

export function getGenerateOpenGraphImageFunction({
	density,
	...satoriOptions
}: { density?: number } & SatoriOptions) {
	const height = 'height' in satoriOptions ? satoriOptions.height : 600;
	const width = 'width' in satoriOptions ? satoriOptions.width : 900;

	return async function generateOpenGraphImage(
		entry: ContentMetadataItem,
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
