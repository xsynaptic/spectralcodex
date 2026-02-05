import type { ImageFormat } from 'unpic';
import type { IPXOptions } from 'unpic/providers/ipx';

import { OPEN_GRAPH_IMAGE_HEIGHT, OPEN_GRAPH_IMAGE_WIDTH } from '@spectralcodex/shared/constants';
import { IPX_SERVER_SECRET, IPX_SERVER_URL } from 'astro:env/server';
import { transform as ipxTransform } from 'unpic/providers/ipx';

import type { IPXOperations } from '#lib/image/image-types.ts';

import { IMAGE_FORMAT, IMAGE_QUALITY, OPEN_GRAPH_IMAGE_DENSITY } from '#constants.ts';
import { generateSignedUrl } from '#lib/image/image-server-utils.ts';

// In development, use local IPX server; in production, use the configured URL
export const ipxBaseUrl = import.meta.env.PROD ? IPX_SERVER_URL : 'http://localhost:3100';

// Fix for IPX v4 alpha bug: quote the s_WxH modifier value
// This way it parses as a JSON string instead of failing
// Example: s_450x300 → s_%22450x300%22 (URL-encoded quotes)
// TODO: Remove this workaround when IPX v4 fixes VArg to handle non-JSON strings
function fixIpxV4SizeModifier(url: string) {
	return url.replaceAll(/s_(\d+x\d+)/g, 's_%22$1%22');
}

/**
 * Generate a signed IPX image URL
 */
export function getIpxImageUrl(
	imageSrc: string,
	options: {
		width: number;
		height?: number;
		sourceWidth?: number;
		sourceHeight?: number;
		quality?: number;
		format?: ImageFormat;
	},
) {
	const { sourceWidth, sourceHeight, quality = IMAGE_QUALITY, format = IMAGE_FORMAT } = options;

	const width = sourceWidth ? Math.min(options.width, sourceWidth) : options.width;
	const height =
		options.height && sourceHeight ? Math.min(options.height, sourceHeight) : options.height;

	const url = ipxTransform(
		imageSrc,
		{
			q: quality,
			f: format,
			...(height ? { s: `${String(width)}x${String(height)}` } : { w: width }),
		},
		{ baseURL: ipxBaseUrl },
	);

	return generateSignedUrl(url, IPX_SERVER_SECRET);
}

// Signed transformer that wraps IPX with URL signing and default operations for the image component
export function signedIpxTransformer(
	src: string | URL,
	operations: IPXOperations,
	options?: IPXOptions,
) {
	const url = ipxTransform(
		src,
		{ ...operations, q: IMAGE_QUALITY, f: IMAGE_FORMAT },
		{ ...options, baseURL: ipxBaseUrl },
	);

	return generateSignedUrl(fixIpxV4SizeModifier(url), IPX_SERVER_SECRET);
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
