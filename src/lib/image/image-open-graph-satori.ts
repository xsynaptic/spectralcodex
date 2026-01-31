import type {
	OpenGraphMetadataItem,
	OpenGraphSatoriOptions,
} from '@spectralcodex/image-open-graph';
import type { CollectionEntry } from 'astro:content';

import { getGenerateOpenGraphImageFunction as getBaseGenerateOpenGraphImageFunction } from '@spectralcodex/image-open-graph';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

import { cacheFileExists, getCacheInstance, hashData } from '#lib/utils/cache.ts';

interface CacheMetadata {
	generatedAt: string;
	metadataHash: string;
	sourceImageModifiedTime?: string | undefined;
}

const OPENGRAPH_IMAGE_SATORI_CACHE_DIR = path.join(CUSTOM_CACHE_PATH, 'opengraph-image');

/**
 * Initialize Keyv with SQLite backend for timestamp tracking
 */
const cacheInstance = getCacheInstance('opengraph-satori');

/**
 * Create a cached wrapper around the Satori-based OpenGraph image generator
 * Uses Keyv (SQLite) for metadata tracking and filesystem for image storage
 */
export function getGenerateOpenGraphImageFunction(satoriOptions: OpenGraphSatoriOptions) {
	const baseGenerator = getBaseGenerateOpenGraphImageFunction(satoriOptions);

	// Satori always outputs PNG
	const format = 'png';

	// Return cached wrapper function
	return async function generateOpenGraphImage(
		metadataItem: OpenGraphMetadataItem,
		imageObject?: sharp.Sharp,
		imageEntry?: CollectionEntry<'images'>,
	): Promise<Buffer> {
		const cacheFilename = `${metadataItem.id}.${format}`;
		const cachePath = path.join(OPENGRAPH_IMAGE_SATORI_CACHE_DIR, cacheFilename);

		// Compute hash of metadata
		const currentMetadataHash = hashData({ data: metadataItem });

		// Get cached record
		const cachedString = await cacheInstance.get<string | undefined>(metadataItem.id);
		const cached: CacheMetadata | undefined = cachedString
			? (JSON.parse(cachedString) as CacheMetadata)
			: undefined;

		// Check if cache is still valid
		const metadataUnchanged = cached?.metadataHash === currentMetadataHash;

		const imageUnchanged =
			!imageEntry?.data.modifiedTime ||
			!cached?.sourceImageModifiedTime ||
			imageEntry.data.modifiedTime <= new Date(cached.sourceImageModifiedTime);

		const isValid = metadataUnchanged && imageUnchanged;

		if (isValid && (await cacheFileExists(cachePath))) {
			// Cache HIT - return existing file
			return fs.readFile(cachePath);
		}

		// Cache MISS - generate new image
		const imageBuffer = await baseGenerator(metadataItem, imageObject);

		// Save image to cache
		await fs.mkdir(OPENGRAPH_IMAGE_SATORI_CACHE_DIR, { recursive: true });
		await fs.writeFile(cachePath, new Uint8Array(imageBuffer));

		// Update metadata in Keyv
		const cacheMetadata: CacheMetadata = {
			generatedAt: new Date().toISOString(),
			metadataHash: currentMetadataHash,
			sourceImageModifiedTime: imageEntry?.data.modifiedTime?.toISOString() ?? undefined,
		};

		await cacheInstance.set(metadataItem.id, JSON.stringify(cacheMetadata));

		return imageBuffer;
	};
}
