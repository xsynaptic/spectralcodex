import type { CollectionKey } from 'astro:content';

const { BASE_URL, PROD, SITE } = import.meta.env;

// Join URL path segments, normalizing double slashes; drop-in replacement for the url-join package
export function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}

export const getBaseUrl = (...routeParts: Array<string>): string =>
	joinUrl(BASE_URL, ...routeParts);

// Example: /base/{routeParts}
export const getSiteUrl = (...routeParts: Array<string>): string =>
	joinUrl(PROD ? SITE : BASE_URL, ...routeParts, '/');

const rootCollectionIds = new Set(['notes', 'locations', 'pages', 'posts']);

// Example: /base/{collection}/{routeParts}
export const getContentUrl = (collection: CollectionKey, ...routeParts: Array<string>): string =>
	getSiteUrl(rootCollectionIds.has(collection) ? '' : collection, ...routeParts);
