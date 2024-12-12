import urlJoin from 'url-join';

import type { CollectionKey } from 'astro:content';

const { BASE_URL, PROD, SITE } = import.meta.env;

export const getBasePath = (...routeParts: string[]): string => urlJoin(BASE_URL, ...routeParts);

// Example: /base/{routeParts}
export const getSiteUrl = (...routeParts: string[]): string =>
	urlJoin(PROD ? SITE : BASE_URL, ...routeParts, '/');

// Example: /base/{collection}/{routeParts}
export const getContentUrl = (collection: CollectionKey, ...routeParts: string[]): string =>
	getSiteUrl(
		['ephemera', 'locations', 'pages', 'posts'].includes(collection) ? '' : collection,
		...routeParts,
	);
