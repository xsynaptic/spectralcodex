import type { ImageFormat } from '@spectralcodex/shared/images';

import sharp from 'sharp';

// Part of every output's cache key; bump it when the pipeline below changes its bytes
export const imageRenderRevision = 3;

interface ImageRender {
	format: ImageFormat;
	height?: number | undefined;
	quality: number;
	width?: number | undefined;
}

export async function renderImage(source: string, { format, height, quality, width }: ImageRender) {
	let stage = sharp(source).autoOrient();

	if (width !== undefined && height !== undefined) {
		stage = stage.resize({ fastShrinkOnLoad: false, fit: 'cover', height, width });
	} else if (width !== undefined) {
		stage = stage.resize({ fastShrinkOnLoad: false, width, withoutEnlargement: true });
	}

	if (format === 'jpg') {
		return stage.jpeg({ mozjpeg: true, quality }).toBuffer({ resolveWithObject: true });
	}

	return stage.webp({ effort: 6, quality }).toBuffer({ resolveWithObject: true });
}
