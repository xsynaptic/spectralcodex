import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { RelatedContentEmbedding } from './index.js';

type VectorCache = Record<string, RelatedContentEmbedding>;

const CACHE_FILE_NAME = 'related-content-vector-cache.json';

export function loadCache(cacheDir: string): VectorCache {
	const cachePath = path.join(cacheDir, CACHE_FILE_NAME);

	if (!existsSync(cachePath)) {
		return {};
	}

	try {
		const data = readFileSync(cachePath, 'utf8');
		const cache = JSON.parse(data) as VectorCache;

		console.log(`📦 Loaded ${String(Object.keys(cache).length)} cached embeddings`);
		return cache;
	} catch (error) {
		console.warn('⚠️  Failed to load embedding cache:', error);
		return {};
	}
}

export function saveCache(cache: VectorCache, cacheDir: string): void {
	const cachePath = path.join(cacheDir, CACHE_FILE_NAME);

	try {
		// eslint-disable-next-line unicorn/no-null
		writeFileSync(cachePath, JSON.stringify(cache, null, 2));
		console.log(`💾 Saved ${String(Object.keys(cache).length)} embeddings to cache`);
	} catch (error) {
		console.error('❌ Failed to save embedding cache:', error);
	}
}

export function getCachedEmbedding(
	cache: VectorCache,
	contentId: string,
	contentHash: string,
): RelatedContentEmbedding | undefined {
	const cached = cache[contentId];

	return cached?.hash === contentHash ? cached : undefined;
}
