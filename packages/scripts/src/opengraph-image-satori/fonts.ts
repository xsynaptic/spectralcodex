import type { Font } from 'satori';

import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { OpenGraphFontConfig, OpenGraphFontVariant } from './types.js';

const require = createRequire(import.meta.url);

/**
 * Load font data from @fontsource package in node_modules
 * File pattern: {package}-{subset}-{weight}-{style}.woff
 */
async function loadFontData({
	packageName,
	variant,
}: {
	packageName: string;
	variant: OpenGraphFontVariant;
}): Promise<ArrayBuffer> {
	const filename = `${packageName}-${variant.subset}-${String(variant.weight)}-${variant.style}.woff`;

	// Resolve path from @fontsource package
	const packagePath = require.resolve(`@fontsource/${packageName}/package.json`);
	const fontPath = path.join(path.dirname(packagePath), 'files', filename);

	const buffer = await fs.readFile(fontPath);

	return buffer.buffer;
}

/**
 * Load all configured fonts for OpenGraph image generation
 * Fonts are loaded from @fontsource packages in node_modules
 * Returns array in Satori-compatible format
 */
export async function loadFonts({
	fontConfigs,
}: {
	fontConfigs: Array<OpenGraphFontConfig>;
}): Promise<Array<Font>> {
	const fonts: Array<Font> = [];

	for (const config of fontConfigs) {
		for (const variant of config.variants) {
			const data = await loadFontData({ packageName: config.package, variant });

			fonts.push({
				name: config.name,
				data,
				weight: variant.weight,
				style: variant.style,
			});
		}
	}

	return fonts;
}
