import ky from 'ky';
import sharp from 'sharp';

// Note 1: this function can overwhelm the image host, hence using `ky` with retry support
export async function getImageFileBufferAsync(src: string): Promise<Buffer | undefined> {
	if (!src) return undefined;

	const imageUrl = new URL(src, import.meta.env.SITE);

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
