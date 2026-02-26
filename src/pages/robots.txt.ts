import type { APIRoute } from 'astro';

import { getSiteUrl } from '#lib/utils/routing.ts';

export const GET = (() => {
	const sitemapUrl = `${getSiteUrl()}sitemap-index.xml`;

	return new Response(`User-agent: *
Disallow: /_x/
Disallow: /pagefind/
Disallow: /api/

Sitemap: ${sitemapUrl}
`);
}) satisfies APIRoute;
