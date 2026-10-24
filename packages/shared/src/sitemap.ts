import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';

const SitemapLastmodSchema = z.object({
	generatedAt: z.string(),
	urls: z.record(z.string(), z.string()),
});

export type SitemapLastmod = z.infer<typeof SitemapLastmodSchema>;

export function readSitemapLastmod(filePath: string): SitemapLastmod {
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
