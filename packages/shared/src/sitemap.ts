import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';

import { sitemapLastmodPath } from '#constants.ts';

// Shared by the sitemap filter and the content manifest; they must agree on what is indexable
const sitemapExcludePrefixes = ['/objectives', '/taiwan-theater-project', '/chronology'];

const SitemapLastmodSchema = z.object({
	generatedAt: z.string(),
	urls: z.record(z.string(), z.string()),
});

export type SitemapLastmod = z.infer<typeof SitemapLastmodSchema>;

export function isIndexableUrlPath(pathname: string): boolean {
	const normalized = pathname.replace(/\/$/, '');

	// Paginated routes repeat content already indexed at page one
	if (/\/\d+$/.test(normalized)) return false;

	return sitemapExcludePrefixes.every(
		(prefix) => !(normalized === prefix || normalized.startsWith(prefix + '/')),
	);
}

export function readSitemapLastmod(filePath = sitemapLastmodPath): SitemapLastmod {
	if (existsSync(filePath)) {
		try {
			return SitemapLastmodSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
		} catch (error) {
			console.warn(
				`[sitemap] Failed to read ${filePath}; using current time as fallback. ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	return { generatedAt: new Date().toISOString(), urls: {} };
}
