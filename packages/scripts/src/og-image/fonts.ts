import type { Font } from 'takumi-js';

import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

interface FontsourceConfig {
	// Font family name as referenced by `fontFamily` in the template
	name: string;
	// @fontsource package without the scope (*e.g.* noto-serif-tc)
	package: string;
	variants: Array<FontVariant>;
}

interface FontVariant {
	style: 'italic' | 'normal';
	subset: string;
	weight: number;
}

const fontConfigs: Array<FontsourceConfig> = [
	{
		package: 'lora',
		name: 'Lora',
		variants: [{ weight: 700, style: 'normal', subset: 'latin' }],
	},
	{
		package: 'noto-serif-tc',
		name: 'Noto Serif TC',
		variants: [{ weight: 700, style: 'normal', subset: 'chinese-traditional' }],
	},
	{
		package: 'noto-serif-thai',
		name: 'Noto Serif Thai',
		variants: [{ weight: 500, style: 'normal', subset: 'thai' }],
	},
	{
		package: 'zen-antique',
		name: 'Zen Antique',
		variants: [{ weight: 400, style: 'normal', subset: 'japanese' }],
	},
];

// @fontsource packages are resolved by a computed path, so knip cannot see them; see knip.config.ts
const resolver = createRequire(import.meta.url);

export async function loadOpenGraphFonts(): Promise<Array<Font>> {
	const fonts: Array<Font> = [];

	for (const config of fontConfigs) {
		for (const variant of config.variants) {
			const filename = `${config.package}-${variant.subset}-${String(variant.weight)}-${variant.style}.woff2`;
			const packageJson = resolver.resolve(`@fontsource/${config.package}/package.json`);
			const data = await fs.readFile(path.join(path.dirname(packageJson), 'files', filename));

			fonts.push({
				data,
				name: config.name,
				style: variant.style,
				weight: variant.weight,
			});
		}
	}

	return fonts;
}
