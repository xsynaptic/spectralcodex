import { BUILD_OUTPUT_PATH } from 'astro:env/server';
import ky from 'ky';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as R from 'remeda';
import sharp from 'sharp';

const { ASSETS_PREFIX, BASE_URL, PROD, SITE } = import.meta.env;

// Astro images often have a bunch of query parameters crammed onto the end, let's parse it right
function getImageFileExtension(src?: string): string {
	if (src) {
		const imageFilePath = src.split('?')[0] ?? '';
		const extensionIndex = imageFilePath.lastIndexOf('.');

		if (extensionIndex !== -1) return imageFilePath.slice(extensionIndex + 1);
	}
	return '';
}

// Type guard until types are improved in Astro
function isAssetsPrefixObject(
	assetsPrefix: string | Record<string, string>,
): assetsPrefix is Record<string, string> {
	return typeof assetsPrefix === 'object';
}

// Note 1: the base URL needs to be stripped from the local path when building for production
// Note 2: this function can overwhelm localhost, hence using `ky` with retry support
// TODO: a persistent cache for this function may improve build times
// TODO: remove this function if it is no longer needed
export async function getLocalImageFileBufferAsync(src: string): Promise<Buffer | undefined> {
	if (!src) return undefined;

	if (PROD) {
		const extension = getImageFileExtension(src);
		const basePath =
			isAssetsPrefixObject(ASSETS_PREFIX) &&
			R.keys(ASSETS_PREFIX).includes(extension) &&
			ASSETS_PREFIX[extension]
				? ASSETS_PREFIX[extension]
				: BASE_URL;

		return readFileSync(path.join(String(BUILD_OUTPUT_PATH), src.replace(basePath, '')));
	} else {
		const imageUrl = new URL(src, SITE);

		try {
			const response = await ky.get(imageUrl, {
				retry: { backoffLimit: 300 },
				timeout: false,
			});
			const responseBuffer = await response.arrayBuffer();
			const imageFileBuffer = Buffer.from(responseBuffer);

			return imageFileBuffer;
		} catch (error) {
			console.warn(`[Image] Error fetching image from ${imageUrl.toString()}`, error);
		}
	}
	return undefined;
}

// Note 1: this function can overwhelm the image host, hence using `ky` with retry support
export async function getImageFileBufferAsync(src: string): Promise<Buffer | undefined> {
	if (!src) return undefined;

	const imageUrl = new URL(src, SITE);

	try {
		const response = await ky.get(imageUrl, {
			retry: { backoffLimit: 300 },
			timeout: false,
		});
		const responseBuffer = await response.arrayBuffer();
		const imageFileBuffer = Buffer.from(responseBuffer);

		return imageFileBuffer;
	} catch (error) {
		console.warn(`[Image] Error fetching image from ${imageUrl.toString()}`, error);
	}
	return undefined;
}

// A simple utility function to handle invoking Sharp after locating an image on disk
export async function getImageObject(src: string) {
	const imageFileBuffer = await getImageFileBufferAsync(src);

	return sharp(imageFileBuffer, { failOn: 'error' });
}
