import { sitemapLastmodPath } from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { getCollectionEntries, withAstroContent } from '../shared/astro-content.js';
import { getPublicId } from '../shared/entries.js';
import { safelyCreateDirectory } from '../shared/utils.js';
import { getGitFileDates } from './git-file-dates.js';

interface SitemapLastmodOptions {
	rootPath: string;
	siteUrl: string;
	contentPath?: string;
	outputPath?: string;
}

const rootCollections = new Set(['locations', 'pages', 'posts']);

function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}

function buildContentUrl(siteUrl: string, collection: string, id: string): string {
	const collectionSegment = rootCollections.has(collection) ? '' : collection;

	return joinUrl(siteUrl, collectionSegment, id, '/');
}

function resolvePaths(options: SitemapLastmodOptions) {
	const contentPathRelative = options.contentPath ?? 'packages/content';

	return {
		contentPathRelative,
		contentPathAbs: path.resolve(options.rootPath, contentPathRelative),
		outputPath: path.resolve(options.rootPath, options.outputPath ?? sitemapLastmodPath),
	};
}

export async function generateSitemapLastmod(options: SitemapLastmodOptions): Promise<void> {
	console.log(chalk.magenta('=== Sitemap lastmod ==='));

	const { contentPathRelative, contentPathAbs, outputPath } = resolvePaths(options);

	console.log(chalk.blue('Reading git log...'));

	const gitMap = await getGitFileDates({
		cwd: contentPathAbs,
		pathspec: 'collections/',
		keyPrefix: contentPathRelative,
	});

	console.log(chalk.blue('Loading content...'));

	// Only file-based content collections carry a `filePath` under the content directory
	const entries = await withAstroContent((content) =>
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
	);

	const urls: Record<string, string> = {};
	const contentPathPrefix = `${contentPathRelative}/collections/`;

	let resolvedCount = 0;
	let missingDateCount = 0;

	for (const entry of entries) {
		if (!entry.filePath?.startsWith(contentPathPrefix)) continue;

		const gitDate = gitMap.get(entry.filePath);

		if (!gitDate) {
			missingDateCount++;
			console.log(chalk.yellow(`  No git history: ${entry.filePath}`));
			continue;
		}

		const url = buildContentUrl(options.siteUrl, entry.collection, getPublicId(entry));

		urls[url] = gitDate;
		resolvedCount++;
	}

	safelyCreateDirectory(path.dirname(outputPath));

	const payload = {
		generatedAt: new Date().toISOString(),
		urls,
	};

	writeFileSync(outputPath, JSON.stringify(payload, undefined, 2));

	console.log(chalk.green(`Resolved: ${String(resolvedCount)} URLs`));

	if (missingDateCount > 0) {
		console.log(chalk.yellow(`  ${String(missingDateCount)} entries with no matching git history`));
	}

	console.log(chalk.gray(`Output: ${outputPath}`));
}
