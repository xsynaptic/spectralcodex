import type { ImagePresetName } from '@spectralcodex/shared/images';
import type { ImageSource } from '@xsynaptic/astro-image-pipeline/names';

import { getImageName } from '@spectralcodex/shared/images';
import { IMAGE_BASE_URL } from 'astro:env/server';

interface ImagePathOptions {
	imageSource: ImageSource;
	preset: ImagePresetName;
}

export const imageBaseUrl = IMAGE_BASE_URL.replace(/\/+$/, '');

function getImageUrl(imagePath: string) {
	return `${imageBaseUrl}/${imagePath}`;
}

export function createImagePathFunction({ imageSource, preset }: ImagePathOptions) {
	return function getImagePath(width: number | undefined) {
		return getImageName(imageSource, preset, width);
	};
}

export function createImageUrlFunction(options: ImagePathOptions) {
	const getImagePath = createImagePathFunction(options);

	return function getPresetImageUrl(width: number | undefined) {
		return getImageUrl(getImagePath(width));
	};
}
