import KeyvSqlite from '@keyv/sqlite';
import Keyv from 'keyv';
import KeyvFile from 'keyv-file';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash } from 'ohash';
import pMemoize from 'p-memoize';

/**
 * Initialize Keyv with file-based JSON backend
 * Best for batch processing scripts
 */
export function getFileCacheInstance(cachePath: string, namespace: string): Keyv {
	return new Keyv({
		store: new KeyvFile({
			filename: path.join(cachePath, `${namespace}.json`),
			writeDelay: 100,
			serialize: JSON.stringify,
			deserialize: (val): unknown => JSON.parse(val.toString()),
		}),
		namespace,
	});
}

/**
 * Initialize Keyv with SQLite backend
 * Best for concurrent access during Astro builds
 */
export function getSqliteCacheInstance(cachePath: string, namespace: string): Keyv {
	return new Keyv({
		store: new KeyvSqlite({
			uri: `sqlite://${path.join(cachePath, `${namespace}.sqlite`)}`,
			table: 'cache',
			busyTimeout: 10_000,
		}),
		namespace,
	});
}

/**
 * Generate an abbreviated hash of data for cache validation
 */
export function hashShort({ data, length = 12 }: { data: unknown; length?: number }): string {
	return hash(data).slice(0, length);
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
 * Check if a cached file exists on disk (memoized for performance)
 */
export async function cacheFileExists(filePath: string): Promise<boolean> {
	const dirPath = path.dirname(filePath);
	const fileName = path.basename(filePath);
	const dirContents = await getCacheDirectoryContents(dirPath);

	return dirContents.has(fileName);
}

export { hash } from 'ohash';
