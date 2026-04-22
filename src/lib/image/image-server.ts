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
 * Build a signed IPX path
 * Output matches what nginx hashes via `secure_link_md5 "${uri}${IPX_SERVER_SECRET}"`
 * Callers prepend IPX_SERVER_URL themselves to produce a browser-fetchable URL
 */
export function createSignedIpxPathFunction({
	imageQuality,
	imageFormat,
	serverSecret,
}: {
	imageQuality: number;
	imageFormat: ImageFormat;
	serverSecret: string;
}) {
	return function getSignedIpxPath(
		src: string | URL,
		operations: IPXOperations,
		options?: IPXOptions,
	): string {
		const path = ipxTransform(
			src,
			{ ...operations, quality: imageQuality, format: imageFormat },
			{ ...options, baseURL: '/' },
		);

		return generateSignedUrl(fixIpxV4SizeModifier(path), serverSecret);
	};
}
