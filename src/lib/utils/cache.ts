import type { KeyvOptions } from 'keyv';

import KeyvSqlite from '@keyv/sqlite';
import { CACHE_DIR } from 'astro:env/server';
import Keyv from 'keyv';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash } from 'ohash';
import pMemoize from 'p-memoize';

/**
 * Initialize Keyv with SQLite backend
 */
export function getCacheInstance(namespace: string, options?: KeyvOptions) {
	return new Keyv({
		store: new KeyvSqlite({
			uri: `sqlite://${path.join(CACHE_DIR, `${namespace}.sqlite`)}`,
			table: 'cache',
			busyTimeout: 10_000,
			...options,
		}),
		namespace,
	});
}

/**
 * Generate MD5 hash of data for cache validation
 * @param data - Data to hash (will be JSON stringified)
 * @param short - Return 8-char hash instead of full 32-char hash
 */
export function hashData({ data, short = false }: { data: unknown; short?: boolean }): string {
	const hashValue = hash(data);

	return short ? hashValue.slice(0, 12) : hashValue;
}

/**
 * Get directory contents, memoized to avoid repeated file I/O during builds
 */
const getCacheDirectoryContents = pMemoize(async (dirPath: string): Promise<Set<string>> => {
	try {
		const files = await fs.readdir(dirPath);

		return new Set(files);
	} catch {
		return new Set<string>();
	}
});

/**
 * Check if a cached file exists on disk
 */
export async function cacheFileExists(filePath: string): Promise<boolean> {
	const dirPath = path.dirname(filePath);
	const fileName = path.basename(filePath);
	const dirContents = await getCacheDirectoryContents(dirPath);

	return dirContents.has(fileName);
}
