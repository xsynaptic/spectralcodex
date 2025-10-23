import type {
	OpenGraphMetadataItem,
	OpenGraphSatoriOptions,
} from '@spectralcodex/image-open-graph';
import type { CollectionEntry } from 'astro:content';

import KeyvSqlite from '@keyv/sqlite';
import { getGenerateOpenGraphImageFunction as getBaseGenerateOpenGraphImageFunction } from '@spectralcodex/image-open-graph';
import { CACHE_DIR } from 'astro:env/server';
import Keyv from 'keyv';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

interface CacheMetadata {
	generatedAt: string;
	metadata: {
		collection: string;
		title: string;
		title_zh?: string | undefined;
	};
	sourceImageModifiedTime?: string | undefined;
}

const OPENGRAPH_IMAGE_SATORI_CACHE_DIR = path.join(CACHE_DIR, 'opengraph-image');

/**
 * Initialize Keyv with SQLite backend for timestamp tracking
 */
const keyv = new Keyv({
	store: new KeyvSqlite({
		uri: `sqlite://${path.join(CACHE_DIR, 'opengraph-satori.sqlite')}`,
		table: 'opengraph_satori_cache',
		busyTimeout: 10_000,
	}),
	namespace: 'opengraph-satori',
});

/**
 * Check if a cached file exists on disk
 */
async function cacheFileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}

/**
 * Create a cached wrapper around the Satori-based OpenGraph image generator
 * Uses Keyv (SQLite) for metadata tracking and filesystem for image storage
 */
export function getGenerateOpenGraphImageFunction(satoriOptions: OpenGraphSatoriOptions) {
	const baseGenerator = getBaseGenerateOpenGraphImageFunction(satoriOptions);

	// Satori always outputs PNG
	const format = 'png';

	// Return cached wrapper function
	return async function generateWithCache(
		entry: OpenGraphMetadataItem,
		imageObject?: sharp.Sharp,
		imageEntry?: CollectionEntry<'images'>,
	): Promise<Buffer> {
		const cacheFilename = `${entry.id}.${format}`;
		const cachePath = path.join(OPENGRAPH_IMAGE_SATORI_CACHE_DIR, cacheFilename);

		// Extract current metadata (only fields used in template)
		const currentMetadata = {
			collection: entry.collection,
			title: entry.title,
			...(entry.title_zh ? { title_zh: entry.title_zh } : {}),
		};

		// Get cached record
		const cachedString = await keyv.get<string | undefined>(entry.id);
		const cached: CacheMetadata | undefined = cachedString
			? (JSON.parse(cachedString) as CacheMetadata)
			: undefined;

		// Check if cache is still valid
		const metadataUnchanged =
			cached && JSON.stringify(cached.metadata) === JSON.stringify(currentMetadata);

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
		const imageBuffer = await baseGenerator(entry, imageObject);

		// Save image to cache
		await fs.mkdir(OPENGRAPH_IMAGE_SATORI_CACHE_DIR, { recursive: true });
		await fs.writeFile(cachePath, new Uint8Array(imageBuffer));

		// Update metadata in Keyv
		const cacheMetadata: CacheMetadata = {
			generatedAt: new Date().toISOString(),
			metadata: currentMetadata,
			sourceImageModifiedTime: imageEntry?.data.modifiedTime?.toISOString() ?? undefined,
		};

		await keyv.set(entry.id, JSON.stringify(cacheMetadata));

		return imageBuffer;
	};
}
