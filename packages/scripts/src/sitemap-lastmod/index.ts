import type { SitemapLastmod } from '@spectralcodex/shared/sitemap';
import type { ContentEntry } from '@xsynaptic/astro-scripts';

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
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import type { ScriptPaths } from '#shared/command.ts';

import { safelyCreateDirectory } from '#shared/files.ts';

interface SitemapLastmodOptions {
	paths: ScriptPaths;
	rootPath: string;
	siteUrl: string;
}

export async function generateSitemapLastmod({ paths, rootPath, siteUrl }: SitemapLastmodOptions) {
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
	const { missingDateCount, resolvedCount, urls } = resolveUrls(contentEntries, gitMap, siteUrl);

	safelyCreateDirectory(path.dirname(outputPath));

	const payload = {
		generatedAt: new Date().toISOString(),
		urls,
	} satisfies SitemapLastmod;

	writeFileSync(outputPath, JSON.stringify(payload, undefined, 2));

	log.success(`Resolved ${formatCount(resolvedCount)} URLs → ${outputPath}`);

	if (missingDateCount > 0) {
		log.warn(`${formatCount(missingDateCount)} entries with no matching git history`);
	}
}

function buildContentUrl(siteUrl: string, collection: string, id: string): string {
	return joinUrl(siteUrl, siteBasePath, getCollectionSegment(collection), id, '/');
}

function resolveUrls(entries: Array<ContentEntry>, gitMap: Map<string, string>, siteUrl: string) {
	const urls: Record<string, string> = {};

	let resolvedCount = 0;
	let missingDateCount = 0;

	for (const entry of entries) {
		const gitDate = entry.filePath ? gitMap.get(entry.filePath) : undefined;

		if (!gitDate) {
			missingDateCount++;
			log.detail(`No git history: ${entry.filePath ?? entry.id}`);
			continue;
		}

		const url = buildContentUrl(siteUrl, entry.collection, getPublicId(entry));

		urls[url] = gitDate;
		resolvedCount++;
	}

	return { missingDateCount, resolvedCount, urls };
}
