import type Keyv from 'keyv';

import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { promises as fs } from 'node:fs';
import { hash } from 'ohash';
import sharp from 'sharp';

import type { ImageFitOption, ImagePlaceholderProps } from '#lib/image/image-types.ts';

import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import { ImageFitOptionEnum } from '#lib/image/image-types.ts';
import { getSqliteCacheInstance } from '#lib/utils/cache.ts';

const imagePlaceholderPixelCountHighQuality = 1600;
const imagePlaceholderPixelCountLowQuality = 250;

interface ImagePlaceholderCached {
	hash: string;
	dataUrl: string;
}

// Generate placeholder dimensions from aspect ratio and pixel budget
function getPlaceholderDimensions(aspectRatio: number, pixelCount: number) {
	const height = Math.sqrt(pixelCount / aspectRatio);
	const width = pixelCount / height;

	return { width: Math.round(width), height: Math.round(height) };
}

async function readImageFile(path: string): Promise<Buffer | undefined> {
	try {
		return await fs.readFile(path);
	} catch {
		return undefined;
	}
}

/**
 * Generate a placeholder data URL with specified aspect ratio
 * Sharp handles cropping via fit/position when aspect ratios don't match
 */
async function generatePlaceholderDataUrl({
	path,
	aspectRatio,
	fit = ImageFitOptionEnum.Cover,
	position = 'center',
	pixelCount = imagePlaceholderPixelCountLowQuality,
}: {
	path: string;
	aspectRatio: number;
	fit?: ImageFitOption;
	position?: string;
	pixelCount?: number;
}): Promise<string | undefined> {
	const imageBuffer = await readImageFile(path);

	if (!imageBuffer) return;

	const { width, height } = getPlaceholderDimensions(aspectRatio, pixelCount);

	const placeholderBuffer = await sharp(imageBuffer, { failOn: 'error' })
		.resize(width, height, { fit, position })
		.toFormat('webp', { quality: 10 })
		.modulate({ brightness: 1, saturation: 1.2 })
		.toBuffer({ resolveWithObject: true });

	return `data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString('base64')}`;
}

async function getCachedPlaceholder(
	cache: Keyv,
	cacheKey: string,
	contentHash: string,
): Promise<string | undefined> {
	const cached = await cache.get<ImagePlaceholderCached>(cacheKey);

	return cached?.hash === contentHash ? cached.dataUrl : undefined;
}

// `stat` is authoritative; the collection's stored time covers a source that has since moved
async function getImageMtime(path: string, storedTime: Date | undefined) {
	try {
		const stats = await fs.stat(path);

		return stats.mtimeMs;
	} catch {
		return storedTime?.getTime();
	}
}

/**
 * Get a placeholder for an image with specified aspect ratio
 * Results are cached in SQLite, keyed by imageId + aspectRatio + fit + position + quality
 * The stored mtime hash invalidates stale entries when the source image changes
 *
 * For source aspect ratio placeholders, pass the image's native width/height ratio
 * For cropped placeholders, pass the target display aspect ratio
 */
async function createImagePlaceholderFunction({ cache }: { cache: Keyv }) {
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

		const mtime = await getImageMtime(imageEntry.data.path, imageEntry.data.modifiedTime);

		// Normalize aspect ratio for consistent cache keys
		const normalizedRatio = Math.round(aspectRatio * 1000) / 1000;

		const cacheKey = hash({
			data: {
				imageId,
				aspectRatio: normalizedRatio,
				fit,
				position,
				highQuality,
			},
		});
		const contentHash = hash({ mtime, version: 1 });

		const cachedDataUrl = await getCachedPlaceholder(cache, cacheKey, contentHash);

		if (cachedDataUrl) return cachedDataUrl;

		const placeholder = await generatePlaceholderDataUrl({
			path: imageEntry.data.path,
			aspectRatio,
			fit,
			position,
			pixelCount: highQuality
				? imagePlaceholderPixelCountHighQuality
				: imagePlaceholderPixelCountLowQuality,
		});

		if (placeholder) {
			await cache.set(cacheKey, {
				hash: contentHash,
				dataUrl: placeholder,
			} satisfies ImagePlaceholderCached);
		}

		return placeholder;
	};
}

let imagePlaceholderFunction: ReturnType<typeof createImagePlaceholderFunction> | undefined;

export async function getImagePlaceholderFunction() {
	if (!imagePlaceholderFunction) {
		imagePlaceholderFunction = createImagePlaceholderFunction({
			cache: getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'image-placeholders'),
		});
	}
	return imagePlaceholderFunction;
}
