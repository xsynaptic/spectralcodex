import type { CollectionKey } from 'astro:content';

const { BASE_URL, SITE } = import.meta.env;

// Drop-in replacement for the url-join package
function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}

export const getBasePath = (...routeParts: Array<string>): string =>
	joinUrl(BASE_URL, ...routeParts);

export const getSitePath = (...routeParts: Array<string>): string =>
	joinUrl(BASE_URL, ...routeParts, '/');

export const getAbsoluteUrl = (path: string): string => new URL(path, SITE).href;

const rootCollectionIds = new Set(['locations', 'pages', 'posts']);

// Example: /base/{collection}/{routeParts}
export const getContentPath = (collection: CollectionKey, ...routeParts: Array<string>): string =>
	getSitePath(rootCollectionIds.has(collection) ? '' : collection, ...routeParts);

// Resources without `showPage` have no routed page of their own; they render as plain text
export const getResourcePath = (id: string, showPage: boolean | undefined): string | undefined =>
	showPage ? getContentPath('resources', id) : undefined;
