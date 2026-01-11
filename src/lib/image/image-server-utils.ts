import { createHash } from 'node:crypto';

/**
 * Sign a URL by appending a signature query parameter
 * Pure function that takes the secret as a parameter for testability
 * Note: nginx's $uri is decoded, so we need to decode the pathname again
 */
export function generateSignedUrl(url: string, secret: string): string {
	const urlObj = new URL(url);
	const decodedPathname = decodeURIComponent(urlObj.pathname);
	const signature = createHash('md5').update(`${decodedPathname}${secret}`).digest('base64url');

	urlObj.searchParams.set('s', signature);

	return urlObj.toString();
}
