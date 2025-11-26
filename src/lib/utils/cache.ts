import type { KeyvOptions } from 'keyv';

import KeyvSqlite from '@keyv/sqlite';
import { CACHE_DIR } from 'astro:env/server';
import Keyv from 'keyv';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash } from 'ohash';

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
 * Module-level cache of directory contents to avoid repeated fs.readdir calls
 */
let cacheDirectoryContents: Map<string, Set<string>> | undefined;

async function getCacheDirectoryContents(dirPath: string): Promise<Set<string>> {
	if (!cacheDirectoryContents) {
		cacheDirectoryContents = new Map();
	}

	if (!cacheDirectoryContents.has(dirPath)) {
		try {
			const files = await fs.readdir(dirPath);

			cacheDirectoryContents.set(dirPath, new Set(files));
		} catch {
			cacheDirectoryContents.set(dirPath, new Set());
		}
	}

	return cacheDirectoryContents.get(dirPath)!;
}

/**
 * Check if a cached file exists on disk
 */
export async function cacheFileExists(filePath: string): Promise<boolean> {
	const dirPath = path.dirname(filePath);
	const fileName = path.basename(filePath);
	const dirContents = await getCacheDirectoryContents(dirPath);

	return dirContents.has(fileName);
}
