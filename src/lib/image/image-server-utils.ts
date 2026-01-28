import { createHash } from 'node:crypto';

// Cache the hash object to avoid creating a new one on each call
let hashObject: ReturnType<typeof createHash> | undefined;

function getHashObject() {
	if (!hashObject) {
		hashObject = createHash('md5');
	}
	return hashObject;
}

/**
 * Sign a URL by appending a signature query parameter
 * Pure function that takes the secret as a parameter for testability
 * Note: nginx's $uri is decoded, so we need to decode the pathname again
 */
export function generateSignedUrl(url: string, secret: string): string {
	const urlObj = new URL(url);
	const decodedPathname = decodeURIComponent(urlObj.pathname);
	const signature = getHashObject().update(`${decodedPathname}${secret}`).digest('base64url');

	urlObj.searchParams.set('s', signature);

	return urlObj.toString();
}
