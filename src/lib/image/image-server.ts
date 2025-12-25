import type { ImageFormat } from 'unpic';

import { IPX_SERVER_SECRET, IPX_SERVER_URL } from 'astro:env/server';
import { createHash } from 'node:crypto';
import { transform as ipxTransform } from 'unpic/providers/ipx';

import {
	IMAGE_FORMAT,
	IMAGE_QUALITY,
	OPEN_GRAPH_IMAGE_DENSITY,
	OPEN_GRAPH_IMAGE_HEIGHT,
	OPEN_GRAPH_IMAGE_WIDTH,
} from '#constants.ts';
import {
	getImageSrcsetWidths,
	imageSrcsetWidthsDefault,
	type ImageSrcsetWidthsProps,
} from '#lib/image/image-layout.ts';

// In development, use local IPX server; in production, use the configured URL
export const ipxBaseUrl = import.meta.env.PROD ? IPX_SERVER_URL : 'http://localhost:3100';

/**
 * Sign an image URL for nginx secure_link validation
 * The signature is an MD5 hash of: pathname + secret
 */
export function signImageUrl(url: string): string {
	const urlObj = new URL(url);
	const signature = createHash('md5')
		.update(`${urlObj.pathname}${IPX_SERVER_SECRET}`)
		.digest('base64url');
	urlObj.searchParams.set('s', signature);
	return urlObj.toString();
}

/**
 * Generate a signed IPX image URL
 */
export function getIpxImageUrl(
	imageSrc: string,
	options: { width: number; height?: number; quality?: number; format?: ImageFormat },
) {
	const { width, height, quality = IMAGE_QUALITY, format = IMAGE_FORMAT } = options;

	const url = ipxTransform(
		imageSrc,
		{
			q: quality,
			f: format,
			w: width,
			...(height ? { h: height } : {}),
		},
		{ baseURL: ipxBaseUrl },
	);

	return signImageUrl(url);
}

/**
 * Generate a signed Open Graph image URL
 */
export function getOpenGraphImageUrl(
	imageSrc: string,
	options?: {
		width?: number;
		height?: number;
		density?: number;
		quality?: number;
		format?: 'jpg' | 'png' | 'webp';
	},
) {
	const {
		width = OPEN_GRAPH_IMAGE_WIDTH,
		height = OPEN_GRAPH_IMAGE_HEIGHT,
		density = OPEN_GRAPH_IMAGE_DENSITY,
		quality = IMAGE_QUALITY,
		format = IMAGE_FORMAT,
	} = options ?? {};

	return getIpxImageUrl(imageSrc, {
		width: width * density,
		height: height * density,
		quality,
		format,
	});
}

/**
 * Get breakpoints for responsive images
 */
export function getImageBreakpoints({
	maxWidth,
	widths = imageSrcsetWidthsDefault,
}: ImageSrcsetWidthsProps) {
	return getImageSrcsetWidths({ maxWidth, widths });
}
