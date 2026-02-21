import type { CollectionKey } from 'astro:content';

import urlJoin from 'url-join';

const { BASE_URL, PROD, SITE } = import.meta.env;

export const getBaseUrl = (...routeParts: Array<string>): string =>
	urlJoin(BASE_URL, ...routeParts);

// Example: /base/{routeParts}
export const getSiteUrl = (...routeParts: Array<string>): string =>
	urlJoin(PROD ? SITE : BASE_URL, ...routeParts, '/');

// Example: /base/{collection}/{routeParts}
export const getContentUrl = (collection: CollectionKey, ...routeParts: Array<string>): string =>
	getSiteUrl(
		['ephemera', 'locations', 'pages', 'posts'].includes(collection) ? '' : collection,
		...routeParts,
	);
