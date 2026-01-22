import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { ContentRelatedEmbedding } from './index.js';

type VectorCache = Record<string, ContentRelatedEmbedding>;

function getCacheFileName(modelId: string): string {
	return `content-related-vector-cache-${modelId.replaceAll('/', '-')}.json`;
}

export function loadCache(cacheDir: string, modelId: string): VectorCache {
	const cacheFileName = getCacheFileName(modelId);
	const cachePath = path.join(cacheDir, cacheFileName);

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

export function saveCache(cache: VectorCache, cacheDir: string, modelId: string): void {
	const cacheFileName = getCacheFileName(modelId);
	const cachePath = path.join(cacheDir, cacheFileName);

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
): ContentRelatedEmbedding | undefined {
	const cached = cache[contentId];

	return cached?.hash === contentHash ? cached : undefined;
}
