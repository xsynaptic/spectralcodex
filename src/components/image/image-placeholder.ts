import { hash } from '@spectralcodex/shared/cache';
import { getSqliteCacheInstance } from '@spectralcodex/shared/cache/sqlite';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

import type { ImageFitOption, ImagePlaceholderProps } from '#lib/image/image-types.ts';

import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import { ImageFitOptionEnum } from '#lib/image/image-types.ts';

const IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ = 1600;
const IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ = 250;

/**
 * Generate placeholder dimensions from aspect ratio and pixel budget
 */
function getPlaceholderDimensions(aspectRatio: number, pixelCount: number) {
	const height = Math.sqrt(pixelCount / aspectRatio);
	const width = pixelCount / height;

	return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Generate a placeholder data URL with specified aspect ratio
 * Sharp handles cropping via fit/position when aspect ratios don't match
 */
async function generatePlaceholderDataUrl({
	imageObject,
	aspectRatio,
	fit = ImageFitOptionEnum.Cover,
	position = 'center',
	pixelCount = IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
}: {
	imageObject: sharp.Sharp;
	aspectRatio: number;
	fit?: ImageFitOption;
	position?: string;
	pixelCount?: number;
}): Promise<string | undefined> {
	const { width, height } = getPlaceholderDimensions(aspectRatio, pixelCount);

	const placeholderBuffer = await imageObject
		.resize(width, height, { fit, position })
		.toFormat('webp', { quality: 10 })
		.modulate({ brightness: 1, saturation: 1.2 })
		.toBuffer({ resolveWithObject: true });

	return `data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString('base64')}`;
}

/**
 * Get a placeholder for an image with specified aspect ratio
 * Results are cached in SQLite, keyed by imageId + aspectRatio + fit + position + quality + mtime
 *
 * For source aspect ratio placeholders, pass the image's native width/height ratio
 * For cropped placeholders, pass the target display aspect ratio
 */
async function createImagePlaceholderFunction() {
	const cache = getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'image-placeholders');

	const getImageById = await getImageByIdFunction();

	return async function getImagePlaceholder({
		imageId,
		aspectRatio,
		fit = ImageFitOptionEnum.Cover,
		position = 'center',
		highQuality = false,
	}: ImagePlaceholderProps): Promise<string | undefined> {
		const imageEntry = getImageById(imageId);

		if (!imageEntry) return;

		// Get mtime for cache invalidation
		let mtime: number | undefined;

		try {
			const stats = await fs.stat(imageEntry.data.path);

			mtime = stats.mtimeMs;
		} catch {
			mtime = imageEntry.data.modifiedTime?.getTime();
		}

		// Normalize aspect ratio for consistent cache keys
		const normalizedRatio = Math.round(aspectRatio * 1000) / 1000;

		const cacheKey = hash({
			data: { imageId, aspectRatio: normalizedRatio, fit, position, highQuality, mtime },
		});

		const cached = await cache.get<string | undefined>(cacheKey);

		if (cached) return cached;

		const imageBuffer = await fs.readFile(imageEntry.data.path).catch(() => {
			// Do nothing
		});

		if (!imageBuffer) return;

		const imageObject = sharp(imageBuffer, { failOn: 'error' });

		const placeholder = await generatePlaceholderDataUrl({
			imageObject,
			aspectRatio,
			fit,
			position,
			pixelCount: highQuality ? IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ : IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
		});

		if (placeholder) {
			await cache.set(cacheKey, placeholder);
		}

		return placeholder;
	};
}

let imagePlaceholderFunction: ReturnType<typeof createImagePlaceholderFunction> | undefined;

export async function getImagePlaceholderFunction() {
	if (!imagePlaceholderFunction) {
		imagePlaceholderFunction = createImagePlaceholderFunction();
	}
	return imagePlaceholderFunction;
}
