import { promises as fs } from 'node:fs';
import path from 'node:path';
import { hash } from 'ohash';
import pMemoize from 'p-memoize';

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
