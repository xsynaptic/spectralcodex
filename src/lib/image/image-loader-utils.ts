import { promises as fs } from 'node:fs';
import sharp from 'sharp';

import { IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ, IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ } from '#constants.ts';

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

interface PlaceholderCallbacks {
	onError?: (errorMessage: string) => void;
	onNotFound?: (errorMessage: string) => void;
}

// Math to convert image dimensions into a constrained version for use with the placeholders
// Note: `pixelCount` is the overall number of pixels in the placeholder
function getImagePlaceholderDimensions({
	width,
	height,
	pixelCount,
}: {
	width: number;
	height: number;
	pixelCount: number;
}): { width: number; height: number } {
	const aspectRatio = width / height;
	const heightTarget = Math.sqrt(pixelCount / aspectRatio);
	const widthTarget = pixelCount / heightTarget;

	return { width: Math.round(widthTarget), height: Math.round(heightTarget) };
}

/**
 * Low-quality image placeholder (LQIP) code originally adapted from Erika Florist
 * @link https://github.com/Princesseuh/erika.florist/blob/main/src%2FimageService.ts
 */
async function getImagePlaceholderDataUrl({
	imageObject,
	pixelCount = IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
}: {
	imageObject: sharp.Sharp | undefined;
	pixelCount?: number;
}): Promise<string | undefined> {
	if (!imageObject) return;

	const metadata = await imageObject.metadata();

	if (!metadata.height || !metadata.width) return;

	const placeholderDimensions = getImagePlaceholderDimensions({
		width: metadata.width,
		height: metadata.height,
		pixelCount,
	});

	const placeholderBuffer = await imageObject
		.resize(placeholderDimensions.width, placeholderDimensions.height, { fit: 'inside' })
		.toFormat('webp', { quality: 10 })
		.modulate({
			brightness: 1,
			saturation: 1.2,
		})
		.toBuffer({ resolveWithObject: true });

	return `data:image/${placeholderBuffer.info.format};base64,${placeholderBuffer.data.toString(
		'base64',
	)}`;
}

/**
 * Generate both LQ and HQ image placeholders for use as in-line data URLs
 * Both are generated in a single pass to avoid reading the file twice
 */
export async function getImageFileUrlPlaceholders({
	fileUrl,
	onError,
	onNotFound,
}: PlaceholderCallbacks & { fileUrl: URL }) {
	const imageFileBuffer = await fs.readFile(fileUrl).catch(() => {
		onError?.(`Error reading image at ${fileUrl.href}!`);
		return;
	});

	if (!imageFileBuffer) {
		onNotFound?.(`No valid image found at ${fileUrl.href}!`);
		return { placeholder: undefined, placeholderHq: undefined };
	}

	// Read the image buffer with Sharp
	const imageObject = sharp(imageFileBuffer, { failOn: 'error' });

	// Generate both placeholders in parallel
	const [placeholder, placeholderHq] = await Promise.all([
		getImagePlaceholderDataUrl({
			imageObject: imageObject.clone(),
			pixelCount: IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ,
		}),
		getImagePlaceholderDataUrl({
			imageObject: imageObject.clone(),
			pixelCount: IMAGE_PLACEHOLDER_PIXEL_COUNT_HQ,
		}),
	]);

	return { placeholder, placeholderHq };
}
