import { wrapCjk } from '@xsynaptic/unified-tools';
import { promises as fs } from 'node:fs';
import sharp from 'sharp';

import { IMAGE_PLACEHOLDER_PIXEL_COUNT_LQ } from '#constants.ts';
import { getImagePlaceholderDataUrl } from '#lib/image/image-placeholder.ts';

// Split raw titles in the format `English Title (中文)`
export function getImageTitle(titleRaw: string | undefined) {
	const titleWrapped = titleRaw ? wrapCjk(titleRaw) : undefined;

	if (titleWrapped) {
		const matches = [...titleWrapped.matchAll(/<span lang="zh">(.*?)<\/span>/g)][0];

		// TODO: update this for multilingual use
		return {
			title: titleWrapped
				.replaceAll(/<span lang="zh">.*?<\/span>/g, '')
				.replaceAll(' ()', '') // Sometimes left over after Chinese characters are removed
				.trim(),
			titleAlt: matches ? matches.at(1)?.trim() : undefined,
		};
	}
	return {
		title: undefined,
		titleAlt: undefined,
	};
}

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
