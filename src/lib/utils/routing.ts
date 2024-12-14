import urlJoin from 'url-join';

import type { CollectionKey } from 'astro:content';

const { BASE_URL, PROD, SITE } = import.meta.env;

export const getBaseUrl = (...routeParts: string[]): string => urlJoin(BASE_URL, ...routeParts);

export const getMapApiBaseUrl = (...routeParts: string[]): string =>
	urlJoin(BASE_URL, `api/map/${import.meta.env.BUILD_ID}`, ...routeParts);

// Example: /base/{routeParts}
export const getSiteUrl = (...routeParts: string[]): string =>
	urlJoin(PROD ? SITE : BASE_URL, ...routeParts, '/');

// Example: /base/{collection}/{routeParts}
export const getContentUrl = (collection: CollectionKey, ...routeParts: string[]): string =>
	getSiteUrl(
		['ephemera', 'locations', 'pages', 'posts'].includes(collection) ? '' : collection,
		...routeParts,
	);
