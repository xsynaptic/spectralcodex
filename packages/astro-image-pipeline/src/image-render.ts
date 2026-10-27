import type { SharpInput, SharpOptions } from 'sharp';

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

export function openImageSource(input: SharpInput, options?: Omit<SharpOptions, 'autoOrient'>) {
	return sharp(input, { ...options, autoOrient: true });
}

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
	let stage = openImageSource(source, { limitInputPixels });

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
	const { autoOrient } = await openImageSource(sourcePath).metadata();

	return { height: autoOrient.height, width: autoOrient.width } satisfies ImageDimensions;
}
