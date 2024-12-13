import { readFile } from 'node:fs/promises';
import path from 'node:path';

const getOpenGraphImageFontData = (filename: string) => {
	try {
		return readFile(path.join(process.cwd(), 'public/fonts', filename));
	} catch (error) {
		throw new Error(`Error reading font files for OpenGraph image generation: ${String(error)}`);
	}
};

// Ensure fonts loaded here are already present in `public/fonts`
// This is so we have the option to generate OpenGraph images on the server
// Use `pnpm run copy-public-fonts` if something fails to load
// Note: only TTF/WOFF files supported, and apparently no variable fonts
const getOpenGraphImageFonts = async () => [
	{
		name: 'Geologica',
		data: await getOpenGraphImageFontData('geologica-latin-300-normal.woff'),
		weight: 300 as const,
		style: 'normal' as const,
	},
	{
		name: 'Geologica',
		data: await getOpenGraphImageFontData('geologica-latin-500-normal.woff'),
		weight: 500 as const,
		style: 'normal' as const,
	},
	{
		name: 'Geologica',
		data: await getOpenGraphImageFontData('geologica-latin-700-normal.woff'),
		weight: 700 as const,
		style: 'normal' as const,
	},
];

export const openGraphImageFonts = await getOpenGraphImageFonts();
