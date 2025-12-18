import { promises as fs } from 'node:fs';

import sharp from 'sharp';

/**
 * Read an image file from the filesystem and return it as a Buffer
 * @param filePath - The relative path to the image file (e.g., from imageEntry.data.path)
 */
export async function getImageFileBuffer(filePath: string): Promise<Buffer | undefined> {
	if (!filePath) return undefined;

	try {
		return await fs.readFile(filePath);
	} catch (error) {
		console.warn(`[Image] Error reading image from ${filePath}`, error);
		return undefined;
	}
}

/**
 * Read an image file and return a Sharp instance for processing
 * @param filePath - The relative path to the image file (e.g., from imageEntry.data.path)
 */
export async function getImageObject(filePath: string): Promise<sharp.Sharp | undefined> {
	const imageFileBuffer = await getImageFileBuffer(filePath);

	if (!imageFileBuffer) return undefined;

	return sharp(imageFileBuffer, { failOn: 'error' });
}
