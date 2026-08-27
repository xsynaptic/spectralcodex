import type { CollectionKey } from 'astro:content';

const { BASE_URL, PROD, SITE } = import.meta.env;

// Drop-in replacement for the url-join package
export function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}

export const getBaseUrl = (...routeParts: Array<string>): string =>
	joinUrl(BASE_URL, ...routeParts);

export const getSiteUrl = (...routeParts: Array<string>): string =>
	joinUrl(PROD ? SITE : BASE_URL, ...routeParts, '/');

const rootCollectionIds = new Set(['locations', 'pages', 'posts']);

// Example: /base/{collection}/{routeParts}
export const getContentUrl = (collection: CollectionKey, ...routeParts: Array<string>): string =>
	getSiteUrl(rootCollectionIds.has(collection) ? '' : collection, ...routeParts);

// Resources without `showPage` have no routed page of their own; they render as plain text
export const getResourceUrl = (id: string, showPage: boolean | undefined): string | undefined =>
	showPage ? getContentUrl('resources', id) : undefined;
