import type { ContentEntry } from '@xsynaptic/astro-scripts';
import type { SitemapLastmodPair } from '@xsynaptic/astro-sitemap-lastmod/write';

import { getPublicId } from '@spectralcodex/shared/entries';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { getCollectionSegment, joinUrl, siteBasePath } from '@spectralcodex/shared/routing';
import {
	formatCount,
	getCollectionEntries,
	getEntryCommitDates,
	log,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';
import { createSitemapLastmodWriter } from '@xsynaptic/astro-sitemap-lastmod/write';
import path from 'node:path';

import type { ScriptPaths } from '#shared/command.ts';

interface SitemapLastmodOptions {
	paths: ScriptPaths;
	rootPath: string;
}

export async function generateSitemapLastmod({ paths, rootPath }: SitemapLastmodOptions) {
	const outputPath = getCachePaths(paths.cachePath).sitemapLastmodPath;

	const entries = await withSpinner('Loading content', () =>
		withAstroContent((content) =>
			getCollectionEntries(content, [
				'chronology',
				'locations',
				'pages',
				'posts',
				'regions',
				'resources',
				'series',
				'themes',
			]),
		),
	);

	// Only file-based content collections carry a `filePath` under the content directory
	const contentPathPrefix = `${path.relative(rootPath, paths.contentDataPath)}/`;
	const contentEntries = entries.filter((entry) => entry.filePath?.startsWith(contentPathPrefix));
	const gitMap = await withSpinner('Reading git log', () =>
		getEntryCommitDates(contentEntries, { rootPath }),
	);
	const { missingDateCount, pairs } = resolvePathDates(contentEntries, gitMap);

	const resolvedCount = createSitemapLastmodWriter({ filePath: outputPath }).record(pairs);

	log.success(`Resolved ${formatCount(resolvedCount)} paths → ${outputPath}`);

	if (missingDateCount > 0) {
		log.warn(`${formatCount(missingDateCount)} entries with no matching git history`);
	}
}

function resolvePathDates(entries: Array<ContentEntry>, gitMap: Map<string, string>) {
	const pairs: Array<SitemapLastmodPair> = [];

	let missingDateCount = 0;

	for (const entry of entries) {
		const gitDate = entry.filePath ? gitMap.get(entry.filePath) : undefined;

		if (!gitDate) {
			missingDateCount++;
			log.detail(`No git history: ${entry.filePath ?? entry.id}`);
			continue;
		}

		pairs.push([
			joinUrl(siteBasePath, getCollectionSegment(entry.collection), getPublicId(entry)),
			gitDate,
		]);
	}

	return { missingDateCount, pairs };
}
