import { createHash } from 'node:crypto';
import sharp from 'sharp';

import type { ImageFormat } from '#image-name.ts';

// Bump this whenever a change below alters the output bytes, since it is part of every file's cache key
export const imageRenderRevision = 3;

export const engineVersions = sharp.versions;

// The platform is included because mozjpeg output differs slightly between CPU architectures
export const engineId = createHash('sha256')
	.update(JSON.stringify({ ...engineVersions, arch: process.arch, platform: process.platform }))
	.digest('hex')
	.slice(0, 8);

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

// Sizes are read after EXIF rotation, because the render rotates images the same way
export async function readSourceSize(sourcePath: string) {
	const { autoOrient } = await sharp(sourcePath).metadata();

	return { height: autoOrient.height, width: autoOrient.width };
}
