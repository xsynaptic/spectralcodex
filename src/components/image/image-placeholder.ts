import type { Cache } from '@spectralcodex/shared/cache';
import type { SourceFingerprints } from '@spectralcodex/shared/source-fingerprint';
import type { Buffer } from 'node:buffer';

import { createSqliteCache } from '@spectralcodex/shared/cache';
import { createSourceFingerprints } from '@spectralcodex/shared/source-fingerprint';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { promises as fs } from 'node:fs';
import { hash } from 'ohash';
import sharp from 'sharp';

import type { ImageFitOption, ImagePlaceholderProps } from '#lib/image/image-types.ts';

import { getImageByIdFunction } from '#lib/collections/images/images-data.ts';
import { ImageFitOptionEnum } from '#lib/image/image-types.ts';

const imagePlaceholderPixelCountHighQuality = 1600;
const imagePlaceholderPixelCountLowQuality = 250;

// Source-ratio placeholders pass the native width/height ratio; crops pass the display ratio
async function createImagePlaceholderFunction({
	cache,
	fingerprints,
}: {
	cache: Cache<string>;
	fingerprints: SourceFingerprints;
}) {
	const getImageById = await getImageByIdFunction();

	return async function getImagePlaceholder({
		aspectRatio,
		fit = ImageFitOptionEnum.Cover,
		highQuality = false,
		imageId,
		position = 'center',
	}: ImagePlaceholderProps): Promise<string | undefined> {
		const imageEntry = getImageById(imageId);

		if (!imageEntry) return;

		const sourceVersion = await getSourceVersion(
			fingerprints,
			imageEntry.data.path,
			imageEntry.data.modifiedTime,
		);
		const normalizedRatio = Math.round(aspectRatio * 1000) / 1000;

		const cacheKey = hash({
			data: {
				aspectRatio: normalizedRatio,
				fit,
				highQuality,
				imageId,
				position,
			},
		});
		const contentHash = hash({ source: sourceVersion, version: 1 });

		const cachedDataUrl = cache.get(cacheKey, contentHash);

		if (cachedDataUrl) return cachedDataUrl;

		const placeholder = await generatePlaceholderDataUrl({
			aspectRatio,
			fit,
			path: imageEntry.data.path,
			pixelCount: highQuality
				? imagePlaceholderPixelCountHighQuality
				: imagePlaceholderPixelCountLowQuality,
			position,
		});

		if (placeholder) {
			cache.set(cacheKey, contentHash, placeholder);
		}

		return placeholder;
	};
}

async function generatePlaceholderDataUrl({
	aspectRatio,
	fit = ImageFitOptionEnum.Cover,
	path,
	pixelCount = imagePlaceholderPixelCountLowQuality,
	position = 'center',
}: {
	aspectRatio: number;
	fit?: ImageFitOption;
	path: string;
	pixelCount?: number;
	position?: string;
}): Promise<string | undefined> {
	const imageBuffer = await readImageFile(path);

	if (!imageBuffer) return;

	const { height, width } = getPlaceholderDimensions(aspectRatio, pixelCount);

	const placeholderBuffer = await sharp(imageBuffer, { failOn: 'error' })
		.resize(width, height, { fit, position })
		.toFormat('webp', { quality: 10 })
		.modulate({ brightness: 1, saturation: 1.2 })
		.toBuffer({ resolveWithObject: true });

	return `data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString('base64')}`;
}

// The collection's stored time covers a source that has since moved
async function getSourceVersion(
	fingerprints: SourceFingerprints,
	path: string,
	modifiedTime: Date | undefined,
) {
	const fingerprint = await fingerprints.get(path);

	return fingerprint?.sha256 ?? modifiedTime?.getTime();
}

function getPlaceholderDimensions(aspectRatio: number, pixelCount: number) {
	const height = Math.sqrt(pixelCount / aspectRatio);
	const width = pixelCount / height;

	return { height: Math.round(height), width: Math.round(width) };
}

async function readImageFile(path: string): Promise<Buffer | undefined> {
	try {
		return await fs.readFile(path);
	} catch {
		return undefined;
	}
}

let imagePlaceholderFunction: ReturnType<typeof createImagePlaceholderFunction> | undefined;

export async function getImagePlaceholderFunction() {
	if (!imagePlaceholderFunction) {
		imagePlaceholderFunction = createImagePlaceholderFunction({
			cache: createSqliteCache(CUSTOM_CACHE_PATH, 'image-placeholders'),
			fingerprints: createSourceFingerprints(CUSTOM_CACHE_PATH),
		});
	}
	return imagePlaceholderFunction;
}
