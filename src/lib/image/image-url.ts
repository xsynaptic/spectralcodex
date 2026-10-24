import type { ImagePresetName, ImageSource } from '@spectralcodex/shared/images';

import { getImageDerivative } from '@spectralcodex/shared/images';
import { IMAGE_BASE_URL } from 'astro:env/server';

interface ImagePathOptions {
	imageSource: ImageSource;
	preset: ImagePresetName;
}

export const imageBaseUrl = IMAGE_BASE_URL.replace(/\/+$/, '');

function getImageUrl(imagePath: string) {
	return `${imageBaseUrl}/${imagePath}`;
}

// `getImageDerivative` records every path for the build manifest
export function createImagePathFunction({ imageSource, preset }: ImagePathOptions) {
	return function getImagePath(width: number | undefined) {
		return getImageDerivative(imageSource, preset, width).path;
	};
}

export function createImageUrlFunction(options: ImagePathOptions) {
	const getImagePath = createImagePathFunction(options);

	return function getPresetImageUrl(width: number | undefined) {
		return getImageUrl(getImagePath(width));
	};
}
