import { createHmac } from 'node:crypto';

/**
 * Reproduce Imagor's signature function:
 * - HMAC-SHA256 of the path
 * - URL-safe base64 encoding
 * - Truncation to the specified length
 *
 * Note: Go's base64.URLEncoding uses - and _ instead of + and /
 */
export function signImageServerPath(
	unsignedPath: string,
	secret: string,
	signatureLength: number,
): string {
	return createHmac('sha256', secret)
		.update(unsignedPath)
		.digest('base64')
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.slice(0, signatureLength);
}
