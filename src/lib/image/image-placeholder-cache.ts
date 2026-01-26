import { promises as fs } from 'node:fs';
import sharp from 'sharp';

import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import { getCacheInstance, hashData } from '#lib/utils/cache.ts';

type FitMode = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

interface CroppedPlaceholderOptions {
	imageId: string;
	width: number;
	height: number;
	fit?: FitMode;
	position?: string;
	highQuality?: boolean;
}

const IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ = 250;
const IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ = 1600;

const cache = getCacheInstance('cropped-placeholders');

/**
 * Generate a cropped placeholder that matches IPX crop operations
 * Unlike the standard placeholder which preserves source aspect ratio,
 * this applies the target fit/position first, then scales to placeholder size
 */
async function getCroppedImagePlaceholderDataUrl({
	imageObject,
	width,
	height,
	fit = 'cover',
	position = 'center',
	pixelCount = IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
}: {
	imageObject: sharp.Sharp;
	width: number;
	height: number;
	fit?: FitMode;
	position?: string;
	pixelCount?: number;
}): Promise<string | undefined> {
	const targetAspectRatio = width / height;

	// Calculate placeholder dimensions maintaining target aspect ratio
	const placeholderHeight = Math.sqrt(pixelCount / targetAspectRatio);
	const placeholderWidth = pixelCount / placeholderHeight;

	const placeholderBuffer = await imageObject
		.resize(Math.round(placeholderWidth), Math.round(placeholderHeight), {
			fit,
			position,
		})
		.toFormat('webp', { quality: 10 })
		.modulate({
			brightness: 1,
			saturation: 1.2,
		})
		.toBuffer({ resolveWithObject: true });

	return `data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString('base64')}`;
}

/**
 * Get a cropped placeholder for an image that matches IPX crop operations
 * Results are cached in SQLite with cache key based on imageId + dimensions + fit + position + quality + mtime
 */
export async function getCroppedPlaceholder({
	imageId,
	width,
	height,
	fit = 'cover',
	position = 'center',
	highQuality = false,
}: CroppedPlaceholderOptions): Promise<string | undefined> {
	const getImageById = await getImageByIdFunction();
	const imageEntry = getImageById(imageId);

	if (!imageEntry) return;

	// Get mtime for cache invalidation
	let mtime: number | undefined;

	try {
		const stats = await fs.stat(imageEntry.data.path);

		mtime = stats.mtimeMs;
	} catch {
		// Fall back to modifiedTime from entry if available
		mtime = imageEntry.data.modifiedTime?.getTime();
	}

	const cacheKey = hashData({
		data: { imageId, width, height, fit, position, quality: highQuality, mtime },
	});

	// Check cache
	const cached = await cache.get<string | undefined>(cacheKey);

	if (cached) return cached;

	// Generate cropped placeholder
	const imageBuffer = await fs.readFile(imageEntry.data.path).catch(() => {
		// Do nothing
	});

	if (!imageBuffer) return;

	const imageObject = sharp(imageBuffer, { failOn: 'error' });

	const placeholder = await getCroppedImagePlaceholderDataUrl({
		imageObject,
		width,
		height,
		fit,
		position,
		pixelCount: highQuality ? IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ : IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
	});

	if (placeholder) {
		await cache.set(cacheKey, placeholder);
	}

	return placeholder;
}
