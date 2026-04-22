import { createHash } from 'node:crypto';

/**
 * Sign an IPX path by appending a signature query parameter
 * Input must be a path (e.g. `/w_450,q_88,f_jpg/image.jpg`), not an absolute URL
 * Domain/origin is prepended *after* signing so the signature matches nginx's $uri
 * Note: this needs to be in its own file for integration tests to work
 */
export function generateSignedUrl(path: string, secret: string): string {
	const [pathname = '', query] = path.split('?');
	const decodedPathname = decodeURIComponent(pathname);
	const signature = createHash('md5').update(`${decodedPathname}${secret}`).digest('base64url');
	const params = new URLSearchParams(query);

	params.set('s', signature);

	return `${pathname}?${params.toString()}`;
}
