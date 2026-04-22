import type { ImageFormat } from 'unpic';
import type { IPXOptions } from 'unpic/providers/ipx';

import { transform as ipxTransform } from 'unpic/providers/ipx';

import type { IPXOperations } from '#lib/image/image-types.ts';

import { generateSignedUrl } from '#lib/image/image-server-utils.ts';

/**
 * Fix for IPX v4 alpha bug: quote the s_WxH modifier value
 * This way it parses as a JSON string instead of failing
 * Example: s_450x300 → s_%22450x300%22 (URL-encoded quotes)
 * TODO: Remove this workaround when IPX v4 fixes VArg to handle non-JSON strings
 *
 * @link - https://github.com/unjs/ipx/issues/289
 */
function fixIpxV4SizeModifier(url: string) {
	return url.replaceAll(/s_(\d+x\d+)/g, 's_%22$1%22');
}

/**
 * Prepend the server URL/prefix to a signed, path-only image URL
 * The image URL is built and signed without the prefix so signatures match
 */
function prependServerUrl(path: string, serverUrl: string) {
	if (!serverUrl || serverUrl === '/') return path;
	return serverUrl.replace(/\/$/, '') + path;
}

/**
 * Generate a signed IPX image URL
 */
export function createIpxImageUrlFunction({
	imageQuality,
	imageFormat,
	serverSecret,
	serverUrl,
}: {
	imageQuality: number;
	imageFormat: ImageFormat;
	serverSecret: string;
	serverUrl: string;
}) {
	return function getIpxImageUrl(
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
		const { sourceWidth, sourceHeight, quality = imageQuality, format = imageFormat } = options;

		const width = sourceWidth ? Math.min(options.width, sourceWidth) : options.width;
		const height =
			options.height && sourceHeight ? Math.min(options.height, sourceHeight) : options.height;

		const path = ipxTransform(
			imageSrc,
			{
				q: quality,
				f: format,
				...(height ? { s: `${String(width)}x${String(height)}` } : { w: width }),
			},
			{ baseURL: '/' },
		);

		const signedPath = generateSignedUrl(path, serverSecret);

		return prependServerUrl(signedPath, serverUrl);
	};
}

// Signed transformer that wraps IPX with URL signing and default operations for the image component
export function createSignedIpxTransformer({
	imageQuality,
	imageFormat,
	serverSecret,
	serverUrl,
}: {
	imageQuality: number;
	imageFormat: ImageFormat;
	serverSecret: string;
	serverUrl: string;
}) {
	return function signedIpxTransformer(
		src: string | URL,
		operations: IPXOperations,
		options?: IPXOptions,
	) {
		const path = ipxTransform(
			src,
			{ ...operations, q: imageQuality, f: imageFormat },
			{ ...options, baseURL: '/' },
		);

		const signedPath = generateSignedUrl(fixIpxV4SizeModifier(path), serverSecret);

		return prependServerUrl(signedPath, serverUrl);
	};
}
