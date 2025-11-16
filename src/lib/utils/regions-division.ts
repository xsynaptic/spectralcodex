import { CACHE_DIR } from 'astro:env/server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Construct path to the SVG file
export async function getRegionsDivisionSvgContent(id: string) {
	const svgPath = path.join(process.cwd(), CACHE_DIR, 'divisions', `${id}.svg`);

	try {
		// Read SVG file synchronously during build
		return await readFile(svgPath, 'utf8');
	} catch {
		// File doesn't exist or can't be read; gracefully degrade
		return;
	}
}
