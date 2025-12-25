import type { ImageFormat } from 'unpic';

import { IPX_SERVER_URL } from 'astro:env/server';
import { transform as ipxTransform } from 'unpic/providers/ipx';

import {
	OPEN_GRAPH_IMAGE_DENSITY,
	OPEN_GRAPH_IMAGE_HEIGHT,
	OPEN_GRAPH_IMAGE_WIDTH,
} from '#constants.ts';
import { IMAGE_FORMAT, IMAGE_QUALITY } from '#constants.ts';
import {
	getImageSrcsetWidths,
	imageSrcsetWidthsDefault,
	type ImageSrcsetWidthsProps,
} from '#lib/image/image-layout.ts';

// In development, use local IPX server; in production, use the configured URL
const ipxBaseUrl = import.meta.env.PROD ? IPX_SERVER_URL : `http://localhost:3100`;

/**
 * Generate an IPX image URL directly without local image processing
 */
export function getIpxImageUrl(
	imageSrc: string,
	options: { width: number; height?: number; quality?: number; format?: ImageFormat },
) {
	const { width, height, quality = IMAGE_QUALITY, format = IMAGE_FORMAT } = options;

	return ipxTransform(
		imageSrc,
		{
			q: quality,
			f: format,
			w: width,
			...(height ? { h: height } : {}),
		},
		{ baseURL: ipxBaseUrl },
	);
}

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

export function getIpxImageProps({
	maxWidth,
	widths = imageSrcsetWidthsDefault,
}: ImageSrcsetWidthsProps) {
	const breakpoints = getImageSrcsetWidths({ maxWidth, widths });

	return {
		cdn: 'ipx' as const,
		breakpoints,
		options: { ipx: { baseURL: ipxBaseUrl } },
		operations: { ipx: { q: IMAGE_QUALITY, f: IMAGE_FORMAT } },
	};
}
