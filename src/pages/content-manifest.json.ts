import type { APIRoute } from 'astro';

import { isIndexableUrlPath } from '@spectralcodex/shared/sitemap';

import { getCatalog } from '#lib/catalog/catalog-data.ts';

// Generate JSON consumed by the "page not found" suggestions component
export const GET: APIRoute = async ({ site }) => {
	if (!site) throw new Error('Astro `site` config is required for the content manifest.');

	const catalog = await getCatalog();

	// Content manifest includes relative URLs so we need to normalize output before filtering
	const entries = [...catalog.all()]
		.map(({ url, title }) => ({ url: new URL(url, site).pathname, title }))
		.filter(({ url }) => isIndexableUrlPath(url));

	return Response.json(entries, {
		headers: { 'Content-Type': 'application/json' },
	});
};
