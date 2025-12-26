import { createHash } from 'node:crypto';

/**
 * Sign a URL by appending a signature query parameter
 * Pure function that takes the secret as a parameter for testability
 */
export function generateSignedUrl(url: string, secret: string): string {
	const urlObj = new URL(url);
	const signature = createHash('md5').update(`${urlObj.pathname}${secret}`).digest('base64url');

	urlObj.searchParams.set('s', signature);

	return urlObj.toString();
}
