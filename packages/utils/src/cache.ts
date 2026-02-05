import type { KeyvOptions } from 'keyv';

import KeyvSqlite from '@keyv/sqlite';
import Keyv from 'keyv';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash } from 'ohash';
import pMemoize from 'p-memoize';

/**
 * Initialize Keyv with SQLite backend
 * @param cachePath - Base directory for cache files
 * @param namespace - Cache namespace (used for filename and internal namespacing)
 * @param options - Additional Keyv options
 */
export function getCacheInstance(cachePath: string, namespace: string, options?: KeyvOptions) {
	return new Keyv({
		store: new KeyvSqlite({
			uri: `sqlite://${path.join(cachePath, `${namespace}.sqlite`)}`,
			table: 'cache',
			busyTimeout: 10_000,
			...options,
		}),
		namespace,
	});
}

/**
 * Generate an abbreviated hash of data for cache validation
 */
export function hashShort({ data, length = 12 }: { data: unknown; length?: number }): string {
	const hashValue = hash(data);

	return hashValue.slice(0, length);
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

// Re-export this useful function to reduce dependencies in other packages
export { hash } from 'ohash';
