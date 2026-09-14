import type { ImagorOperations } from '@xsynaptic/unpic-imagor';
import type { ImageFormat } from 'unpic';

import { generate } from '@xsynaptic/unpic-imagor';
import { IMAGE_SERVER_SIGNATURE_LENGTH } from 'astro:env/server';

import { signImageServerPath } from '#lib/image/image-sign.ts';

export function createImageUrlFunction({
	imageFormat,
	imageQuality,
	serverSecret,
	serverUrl,
}: {
	imageFormat: ImageFormat;
	imageQuality: number;
	serverSecret: string;
	serverUrl: string;
}) {
	const getSignedImagePath = createSignedImagePathFunction({
		imageFormat,
		imageQuality,
		serverSecret,
	});

	return function getImageUrl(src: string | URL, operations: ImagorOperations): string {
		return `${serverUrl}${getSignedImagePath(src, operations)}`;
	};
}

export function createSignedImagePathFunction({
	imageFormat,
	imageQuality,
	serverSecret,
	signatureLength = IMAGE_SERVER_SIGNATURE_LENGTH,
}: {
	imageFormat: ImageFormat;
	imageQuality: number;
	serverSecret: string;
	signatureLength?: number;
}) {
	return function getSignedImagePath(src: string | URL, operations: ImagorOperations): string {
		const unsignedPath = generate(
			src,
			{
				...operations,
				format: imageFormat,
				quality: imageQuality,
			},
			{ unsafe: false },
		);

		return `/${signImageServerPath(unsignedPath, serverSecret, signatureLength)}/${unsignedPath}`;
	};
}
