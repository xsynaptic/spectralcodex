import type { FormatEnum, JpegOptions, PngOptions, WebpOptions } from 'sharp';

import { CACHE_DIR } from 'astro:env/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import pMemoize from 'p-memoize';

import {
	OPEN_GRAPH_IMAGE_DENSITY,
	OPEN_GRAPH_IMAGE_HEIGHT,
	OPEN_GRAPH_IMAGE_WIDTH,
} from '#constants.ts';
import { OPEN_GRAPH_BASE_PATH, OPEN_GRAPH_IMAGE_FORMAT } from '#constants.ts';
import { getImageByIdFunction } from '#lib/collections/images/images-utils.ts';
import { getImageObject } from '#lib/image/image-file-handling.ts';
import { cacheFileExists, getCacheInstance } from '#lib/utils/cache.ts';

const OPENGRAPH_IMAGE_CACHE_DIR = path.join(CACHE_DIR, 'opengraph-image');

/**
 * Initialize Keyv with SQLite backend for timestamp tracking
 */
const cacheInstance = getCacheInstance('opengraph');

/**
 * Load pre-generated OG images from public directory
 * Returns a Set of entry IDs for fast lookup
 */
export const getPreGeneratedOpenGraphImages = pMemoize(async (): Promise<Set<string>> => {
	const publicOgPath = path.join(process.cwd(), 'public', OPEN_GRAPH_BASE_PATH);

	try {
		const files = await fs.readdir(publicOgPath);

		// Extract entry IDs by removing file extension
		return new Set(
			files
				.filter((file) => file.endsWith(`.${OPEN_GRAPH_IMAGE_FORMAT}`))
				.map((file) => file.replace(`.${OPEN_GRAPH_IMAGE_FORMAT}`, '')),
		);
	} catch {
		// Directory doesn't exist or is empty
		return new Set<string>();
	}
});

/**
 * A basic OpenGraph image function; nothing fancy, just returns a featured image
 * Note: this is a self-contained function that does not rely on the `@spectralcodex/image-open-graph` package
 */
export async function getOpenGraphImageFunction() {
	const getImageById = await getImageByIdFunction();

	// Ensure cache directory exists
	await fs.mkdir(OPENGRAPH_IMAGE_CACHE_DIR, { recursive: true });

	return async function getOpenGraphImage({
		entryId,
		imageId,
		format,
		formatOptions,
		targetHeight = OPEN_GRAPH_IMAGE_HEIGHT,
		targetWidth = OPEN_GRAPH_IMAGE_WIDTH,
		density = OPEN_GRAPH_IMAGE_DENSITY,
	}: {
		entryId: string;
		imageId: string | undefined;
		targetHeight?: number;
		targetWidth?: number;
		format: keyof Pick<FormatEnum, 'jpg' | 'png' | 'webp'>;
		formatOptions?: JpegOptions | PngOptions | WebpOptions;
		density?: number;
	}) {
		const imageEntry = getImageById(imageId);
		const imageObject = imageEntry ? await getImageObject(imageEntry.data.path) : undefined;

		if (!imageObject) return;

		const cacheFilename = `${entryId}.${format}`;
		const cachePath = path.join(OPENGRAPH_IMAGE_CACHE_DIR, cacheFilename);

		// Check if cache is still valid
		const cachedAt = await cacheInstance.get<string | undefined>(entryId);
		const isValid =
			cachedAt &&
			(!imageEntry?.data.modifiedTime || imageEntry.data.modifiedTime <= new Date(cachedAt));

		// Cached already; return the file
		if (isValid && (await cacheFileExists(cachePath))) {
			const data = await fs.readFile(cachePath);

			return {
				data,
				format: format === 'jpg' ? 'jpeg' : format,
			};
		}

		// Not in the cache; generate new image
		const result = await imageObject
			.resize({
				fit: 'cover',
				height: targetHeight * density,
				width: targetWidth * density,
			})
			.toFormat(format, formatOptions)
			.toBuffer({ resolveWithObject: true });

		// Save image to cache and update timestamp in Keyv
		await fs.writeFile(cachePath, new Uint8Array(result.data));
		await cacheInstance.set(entryId, new Date().toISOString());

		return {
			data: result.data,
			format: result.info.format === 'jpg' ? 'jpeg' : result.info.format,
		};
	};
}
