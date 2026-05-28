import type { AstroIntegration } from 'astro';

import sitemap from '@astrojs/sitemap';
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';

const sitemapLastmodSchema = z.object({
	generatedAt: z.string(),
	urls: z.record(z.string(), z.string()),
});

type SitemapLastmod = z.infer<typeof sitemapLastmodSchema>;

function getSitemapLastmod(sitemapLastmodPath: string): SitemapLastmod {
	if (existsSync(sitemapLastmodPath)) {
		try {
			return sitemapLastmodSchema.parse(JSON.parse(readFileSync(sitemapLastmodPath, 'utf8')));
		} catch (error) {
			console.warn(
				`[astro-sitemap] Failed to read ${sitemapLastmodPath}; using current time as fallback. ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return { generatedAt: new Date().toISOString(), urls: {} };
}

const optionsSchema = z
	.object({
		excludePrefixes: z.array(z.string()).optional(),
		sitemapLastmodPath: z.string().optional(),
	})
	.optional();

type Options = z.input<typeof optionsSchema>;

export default function sitemapIntegration(options?: Options): AstroIntegration {
	const parsed = optionsSchema.parse(options);
	const excludePrefixes = parsed?.excludePrefixes ?? [];
	const sitemapLastmodPath = parsed?.sitemapLastmodPath ?? './.cache/sitemap-lastmod.json';

	const sitemapLastmod = getSitemapLastmod(sitemapLastmodPath);

	return sitemap({
		filter: (page) => {
			const path = new URL(page).pathname.replace(/\/$/, '');

			// Exclude paginated pages (e.g. /posts/2, /locations/3)
			if (/\/\d+$/.test(path)) {
				return false;
			}

			return !excludePrefixes.some((prefix) => path === prefix || path.startsWith(prefix + '/'));
		},
		serialize(item) {
			item.lastmod = sitemapLastmod.urls[item.url] ?? sitemapLastmod.generatedAt;
			return item;
		},
	});
}
