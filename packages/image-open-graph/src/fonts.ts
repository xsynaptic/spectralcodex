import type { Font } from 'satori';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import type { OpenGraphImageFontConfig, OpenGraphImageFontVariant } from './types';

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
 * Load font data from cache or download from Fontsource CDN if not cached
 * Note: Satori requires the font file to be in the WOFF format
 * Pattern: https://cdn.jsdelivr.net/npm/@fontsource/{family}@latest/files/{family}-{subset}-{weight}-{style}.woff
 */
async function loadFontData({
	cacheDir,
	family,
	variant,
}: {
	cacheDir: string;
	family: string;
	variant: OpenGraphImageFontVariant;
}): Promise<ArrayBuffer> {
	const familyLower = family.toLowerCase();
	const filename = `${familyLower}-${variant.subset}-${String(variant.weight)}-${variant.style}.woff`;

	const cachePath = path.join(process.cwd(), cacheDir, filename);

	try {
		await fs.access(cachePath);

		const buffer = await fs.readFile(cachePath);

		return buffer.buffer as ArrayBuffer;
	} catch {
		const url = `https://cdn.jsdelivr.net/npm/@fontsource/${familyLower}@latest/files/${filename}`;

		return downloadFont(url, cachePath);
	}
}

/**
 * Load all configured fonts for OpenGraph image generation
 * Fonts are downloaded from Fontsource CDN and cached locally
 * Returns array in Satori-compatible format
 */
export async function loadOpenGraphImageFonts({
	fontConfigs,
	cacheDir,
}: {
	fontConfigs: Array<OpenGraphImageFontConfig>;
	cacheDir: string;
}): Promise<Array<Font>> {
	const fonts: Array<Font> = [];

	for (const config of fontConfigs) {
		for (const variant of config.variants) {
			const data = await loadFontData({ cacheDir, family: config.family, variant });

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
