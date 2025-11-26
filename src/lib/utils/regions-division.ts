import { CACHE_DIR } from 'astro:env/server';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pMemoize from 'p-memoize';

/**
 * Load all region division SVG files from the cache directory
 * Reads directory once and caches all SVG content for fast lookup
 */
const loadRegionDivisionsSvgCache = pMemoize(async (): Promise<Map<string, string>> => {
	const cache = new Map<string, string>();
	const divisionsPath = path.join(process.cwd(), CACHE_DIR, 'divisions');

	try {
		const files = await readdir(divisionsPath);
		const svgFiles = files.filter((file) => file.endsWith('.svg'));

		await Promise.all(
			svgFiles.map(async (file) => {
				const id = file.replace('.svg', '');
				const content = await readFile(path.join(divisionsPath, file), 'utf8');

				cache.set(id, content);
			}),
		);
	} catch {
		// Directory doesn't exist or can't be read
	}

	return cache;
});

/**
 * Get SVG content for a region division by ID
 */
export async function getRegionsDivisionSvgContent(id: string) {
	const cache = await loadRegionDivisionsSvgCache();

	return cache.get(id);
}
