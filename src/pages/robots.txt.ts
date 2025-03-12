import type { APIRoute } from 'astro';

import { getSiteUrl } from '#lib/utils/routing.ts';

export const GET = (() => {
	const sitemapUrl = `${getSiteUrl()}sitemap-index.xml`;

	return new Response(`User-agent: *
Disallow: /api/
  
User-agent: GPTBot
Disallow: /
User-agent: ChatGPT-User
Disallow: /
User-agent: Google-Extended
Disallow: /
User-agent: CCBot
Disallow: /
User-agent: PerplexityBot
Disallow: /
User-agent: anthropic-ai
Disallow: /
User-agent: Bytespider
Disallow: /

User-agent: *
Sitemap: ${sitemapUrl}
`);
}) satisfies APIRoute;
