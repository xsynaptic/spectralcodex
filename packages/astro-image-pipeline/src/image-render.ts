import { createHash } from 'node:crypto';
import sharp from 'sharp';

import type { ResolvedImageEncoding } from '#image-encoding.ts';
import type { ImageFormat } from '#image-name.ts';
import type { ImageDimensions } from '#image-presets.ts';

export const engineVersions = sharp.versions;

// mozjpeg output differs slightly between CPU architectures
export const engineId = createHash('sha256')
	.update(JSON.stringify({ ...engineVersions, arch: process.arch, platform: process.platform }))
	.digest('hex')
	.slice(0, 8);

interface ImageRender {
	encoding: ResolvedImageEncoding;
	format: ImageFormat;
	height?: number | undefined;
	limitInputPixels: number;
	width?: number | undefined;
}

export async function renderImage(
	source: string,
	{ encoding, format, height, limitInputPixels, width }: ImageRender,
) {
	let stage = sharp(source, { limitInputPixels }).autoOrient();

	if (width !== undefined && height !== undefined) {
		stage = stage.resize({ fastShrinkOnLoad: false, fit: 'cover', height, width });
	} else if (width !== undefined) {
		stage = stage.resize({ fastShrinkOnLoad: false, width, withoutEnlargement: true });
	}

	if (format === 'jpg') {
		return stage.jpeg(encoding.jpg).toBuffer({ resolveWithObject: true });
	}

	return stage.webp(encoding.webp).toBuffer({ resolveWithObject: true });
}

export async function readSourceSize(sourcePath: string) {
	const { autoOrient } = await sharp(sourcePath).metadata();

	return { height: autoOrient.height, width: autoOrient.width } satisfies ImageDimensions;
}
