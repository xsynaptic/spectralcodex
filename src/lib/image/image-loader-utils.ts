import { promises as fs } from 'node:fs';
import sharp from 'sharp';

import { IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ } from '#constants.ts';
import { getImagePlaceholderDataUrl } from '#lib/image/image-placeholder.ts';

// Calculate EV using the formula EV = log2(N^2 / t)
export function getImageExposureValue({
	aperture,
	shutterSpeed,
}: {
	aperture: string | undefined;
	shutterSpeed: string | undefined;
}) {
	if (!aperture || !shutterSpeed) return;

	let shutterTime: number;

	if (shutterSpeed.includes('/')) {
		const [numerator, denominator] = shutterSpeed.split('/').map(Number);

		if (!numerator || !denominator) return;

		shutterTime = numerator / denominator;
	} else {
		shutterTime = Number(shutterSpeed);
	}

	return String(Math.log2(Number(aperture) ** 2 / shutterTime));
}

// Generate an image placeholder for use as an in-line data URL
export async function getImageFileUrlPlaceholder({
	fileUrl,
	onError,
	onNotFound,
}: {
	fileUrl: URL;
	onError?: (errorMessage: string) => void;
	onNotFound?: (errorMessage: string) => void;
}) {
	const imageFileBuffer = await fs.readFile(fileUrl).catch(() => {
		onError?.(`Error reading image at ${fileUrl.href}!`);
		return;
	});

	if (!imageFileBuffer) {
		onNotFound?.(`No valid image found at ${fileUrl.href}!`);
		return;
	}

	// Read the image buffer with Sharp
	const imageObject = sharp(imageFileBuffer, { failOn: 'error' });

	return await getImagePlaceholderDataUrl({
		imageObject,
		pixelCount: IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
	});
}
