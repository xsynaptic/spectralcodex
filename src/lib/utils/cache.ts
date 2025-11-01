import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';

/**
 * Generate MD5 hash of data for cache validation
 * @param data - Data to hash (will be JSON stringified)
 * @param short - Return 8-char hash instead of full 32-char hash
 */
export function hashData({ data, short = false }: { data: unknown; short?: boolean }): string {
	const hash = createHash('md5').update(JSON.stringify(data)).digest('hex');

	return short ? hash.slice(0, 8) : hash;
}

/**
 * Check if a cached file exists on disk
 */
export async function cacheFileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}
