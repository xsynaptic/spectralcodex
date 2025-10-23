import type { Font } from 'satori';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { OpenGraphImageFontConfig, OpenGraphImageFontVariant } from './types';

const CACHE_DIR = 'node_modules/.cache/spectralcodex-og-fonts';

/**
 * Build Fontsource CDN URL for a specific font variant
 * Note: Satori requires the font file to be in the WOFF format
 * Pattern: https://cdn.jsdelivr.net/npm/@fontsource/{family}@latest/files/{family}-{subset}-{weight}-{style}.woff
 */
function buildFontUrl(family: string, variant: OpenGraphImageFontVariant): string {
	const familyLower = family.toLowerCase();
	const filename = `${familyLower}-${variant.subset}-${String(variant.weight)}-${variant.style}.woff`;

	return `https://cdn.jsdelivr.net/npm/@fontsource/${familyLower}@latest/files/${filename}`;
}

/**
 * Build cache file path for a font variant
 */
function buildCachePath(family: string, variant: OpenGraphImageFontVariant): string {
	const familyLower = family.toLowerCase();
	const filename = `${familyLower}-${variant.subset}-${String(variant.weight)}-${variant.style}.woff`;

	return path.join(process.cwd(), CACHE_DIR, filename);
}

/**
 * Download font from CDN and save to cache
 */
async function downloadFont(url: string, cachePath: string): Promise<ArrayBuffer> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to download font from ${url}: ${response.statusText}`);
	}

	const arrayBuffer = await response.arrayBuffer();
	const uint8Array = new Uint8Array(arrayBuffer);

	await fs.mkdir(path.dirname(cachePath), { recursive: true });
	await fs.writeFile(cachePath, uint8Array);

	return arrayBuffer;
}

/**
 * Load font data from cache or download if not cached
 */
async function loadFontData(
	family: string,
	variant: OpenGraphImageFontVariant,
): Promise<ArrayBuffer> {
	const cachePath = buildCachePath(family, variant);

	try {
		await fs.access(cachePath);

		const buffer = await fs.readFile(cachePath);

		return buffer.buffer as ArrayBuffer;
	} catch {
		const url = buildFontUrl(family, variant);

		return downloadFont(url, cachePath);
	}
}

/**
 * Load all configured fonts for OpenGraph image generation
 * Fonts are downloaded from Fontsource CDN and cached locally
 * Returns array in Satori-compatible format
 */
export async function loadOpenGraphImageFonts(
	configs: Array<OpenGraphImageFontConfig>,
): Promise<Array<Font>> {
	const fonts: Array<Font> = [];

	for (const config of configs) {
		for (const variant of config.variants) {
			const data = await loadFontData(config.family, variant);

			fonts.push({
				name: config.family,
				data,
				weight: variant.weight,
				style: variant.style,
			});
		}
	}

	return fonts;
}
