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
	dataUrl: string;
	hash: string;
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
		aspectRatio,
		fit = ImageFitOptionEnum.Cover,
		highQuality = false,
		imageId,
		position = 'center',
	}: ImagePlaceholderProps): Promise<string | undefined> {
		const imageEntry = getImageById(imageId);

		if (!imageEntry) return;

		const mtime = await getImageMtime(imageEntry.data.path, imageEntry.data.modifiedTime);

		// Normalize aspect ratio for consistent cache keys
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
		const contentHash = hash({ mtime, version: 1 });

		const cachedDataUrl = await getCachedPlaceholder(cache, cacheKey, contentHash);

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
			await cache.set(cacheKey, {
				dataUrl: placeholder,
				hash: contentHash,
			} satisfies ImagePlaceholderCached);
		}

		return placeholder;
	};
}

/**
 * Generate a placeholder data URL with specified aspect ratio
 * Sharp handles cropping via fit/position when aspect ratios don't match
 */
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

// Generate placeholder dimensions from aspect ratio and pixel budget
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
			cache: getSqliteCacheInstance(CUSTOM_CACHE_PATH, 'image-placeholders'),
		});
	}
	return imagePlaceholderFunction;
}
