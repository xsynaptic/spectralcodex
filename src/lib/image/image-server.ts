import type { ImageFormat } from 'unpic';

import { IPX_SERVER_URL } from 'astro:env/server';
import { transform as ipxTransform } from 'unpic/providers/ipx';

import type { ImageThumbnail } from '#lib/schemas/image.ts';

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
const ipxBaseUrl = import.meta.env.PROD ? IPX_SERVER_URL : `http://localhost:3002`;

/**
 * Generate an IPX image URL directly without local image processing
 */
function getIpxImageUrl(
	imageSrc: string,
	options: { width: number; height?: number; quality?: number; format?: ImageFormat },
) {
	const { width, height, quality = IMAGE_QUALITY, format = IMAGE_FORMAT } = options;

	return ipxTransform(
		imageSrc,
		{
			w: width,
			...(height ? { h: height } : {}),
			q: quality,
			f: format,
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

/**
 * Generate thumbnail data with srcSet for map popups using IPX
 */
export function getImageThumbnail(
	imageSrc: string,
	options: {
		width: number;
		height: number;
		widths: Array<number>;
		quality?: number;
		format?: ImageFormat;
	},
): ImageThumbnail {
	const { width, height, widths, quality = IMAGE_QUALITY, format = IMAGE_FORMAT } = options;

	// Calculate aspect ratio from base dimensions
	const aspectRatio = width / height;

	// Generate main src URL at base width
	const src = getIpxImageUrl(imageSrc, { width, height, quality, format });

	// Generate srcSet with proportional heights for each width
	const srcSet = widths
		.map((w) => {
			const h = Math.round(w / aspectRatio);
			const url = getIpxImageUrl(imageSrc, { width: w, height: h, quality, format });

			return `${url} ${String(w)}w`;
		})
		.join(', ');

	return {
		src,
		srcSet,
		height: String(height),
		width: String(width),
	};
}
