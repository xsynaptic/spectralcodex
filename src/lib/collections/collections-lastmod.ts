import type { Loader } from 'astro/loaders';

import { getPublicId } from '@spectralcodex/shared/entries';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { getCollectionSegment, joinUrl, siteBasePath } from '@spectralcodex/shared/routing';
import {
	createCommitDateReader,
	createSitemapLastmodWriter,
} from '@xsynaptic/astro-sitemap-lastmod/write';
import { CUSTOM_CACHE_PATH } from 'astro:env/server';

const writer = createSitemapLastmodWriter({
	filePath: getCachePaths(CUSTOM_CACHE_PATH).sitemapLastmodPath,
});

const readCommitDates = createCommitDateReader({ rootPath: process.cwd() });

export function withSitemapLastmod(collection: string, loader: Loader) {
	return writer.wrap(loader, async (entries) => {
		const dates = await readCommitDates(entries);

		return entries.map((entry) => [
			joinUrl(siteBasePath, getCollectionSegment(collection), getPublicId(entry)),
			dates.get(entry.filePath ?? ''),
		]);
	});
}
