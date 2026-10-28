import type { SitemapLastmod } from '@spectralcodex/shared/sitemap';
import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { getPublicId } from '@spectralcodex/shared/entries';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { getCollectionSegment, joinUrl, siteBasePath } from '@spectralcodex/shared/routing';
import {
	formatCount,
	getCollectionEntries,
	log,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { $ } from 'zx';

import type { ScriptPaths } from '#shared/command.ts';

import { safelyCreateDirectory } from '#shared/files.ts';
import { getGitFileDates } from '#sitemap-lastmod/git-file-dates.ts';

interface SitemapLastmodOptions {
	paths: ScriptPaths;
	rootPath: string;
	siteUrl: string;
}

export async function generateSitemapLastmod({ paths, rootPath, siteUrl }: SitemapLastmodOptions) {
	const collectionsPath = paths.contentDataPath;
	const outputPath = getCachePaths(paths.cachePath).sitemapLastmodPath;

	const gitMap = await withSpinner('Reading git log', async () => {
		const topLevel = await $({ cwd: collectionsPath })`git rev-parse --show-toplevel`;
		const keyPrefix = path.relative(rootPath, topLevel.stdout.trim());

		return getGitFileDates({
			cwd: collectionsPath,
			...(keyPrefix ? { keyPrefix } : {}),
			pathspec: '.',
		});
	});

	// Only file-based content collections carry a `filePath` under the content directory
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

	const { missingDateCount, resolvedCount, urls } = resolveUrls(entries, gitMap, {
		contentPathPrefix: `${path.relative(rootPath, collectionsPath)}/`,
		siteUrl,
	});

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

function resolveUrls(
	entries: Array<ContentEntry>,
	gitMap: Map<string, string>,
	{ contentPathPrefix, siteUrl }: { contentPathPrefix: string; siteUrl: string },
) {
	const urls: Record<string, string> = {};

	let resolvedCount = 0;
	let missingDateCount = 0;

	for (const entry of entries) {
		if (!entry.filePath?.startsWith(contentPathPrefix)) continue;

		const gitDate = gitMap.get(entry.filePath);

		if (!gitDate) {
			missingDateCount++;
			log.detail(`No git history: ${entry.filePath}`);
			continue;
		}

		const url = buildContentUrl(siteUrl, entry.collection, getPublicId(entry));

		urls[url] = gitDate;
		resolvedCount++;
	}

	return { missingDateCount, resolvedCount, urls };
}
