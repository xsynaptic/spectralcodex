import type { CollectionKey } from 'astro:content';

// Drop-in replacement for the url-join package
function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}

export const getBasePath = (...routeParts: Array<string>): string =>
	joinUrl(import.meta.env.BASE_URL, ...routeParts);

export const getSitePath = (...routeParts: Array<string>): string =>
	joinUrl(import.meta.env.BASE_URL, ...routeParts, '/');

export const getAbsoluteUrl = (path: string): string => new URL(path, import.meta.env.SITE).href;

const rootCollectionIds = new Set(['locations', 'pages', 'posts']);

// Example: /base/{collection}/{routeParts}
export const getContentPath = (collection: CollectionKey, ...routeParts: Array<string>): string =>
	getSitePath(rootCollectionIds.has(collection) ? '' : collection, ...routeParts);

// Resources without `showPage` have no routed page of their own; they render as plain text
export const getResourcePath = (id: string, showPage: boolean | undefined): string | undefined =>
	showPage ? getContentPath('resources', id) : undefined;
