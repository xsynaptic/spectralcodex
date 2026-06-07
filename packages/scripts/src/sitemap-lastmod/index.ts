#!/usr/bin/env tsx
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { getPublicId, loadDataStore } from '../shared/data-store.js';
import { findWorkspaceRoot, safelyCreateDirectory } from '../shared/utils.js';
import { getGitFileDates } from './git-file-dates.js';

interface SitemapLastmodOptions {
	rootPath: string;
	siteUrl: string;
	contentPath?: string;
	dataStorePath?: string;
	outputPath?: string;
}

const ROOT_COLLECTIONS = new Set(['notes', 'locations', 'pages', 'posts']);

function joinUrl(...parts: Array<string>): string {
	return parts.join('/').replaceAll(/(?<!:)\/\/+/g, '/');
}

function buildContentUrl(siteUrl: string, collection: string, id: string): string {
	const collectionSegment = ROOT_COLLECTIONS.has(collection) ? '' : collection;

	return joinUrl(siteUrl, collectionSegment, id, '/');
}

export async function generateSitemapLastmod(options: SitemapLastmodOptions): Promise<void> {
	console.log(chalk.magenta('=== Sitemap lastmod ==='));

	const contentPathRelative = options.contentPath ?? 'packages/content';
	const contentPathAbs = path.resolve(options.rootPath, contentPathRelative);
	const dataStorePath = path.resolve(
		options.rootPath,
		options.dataStorePath ?? '.astro/data-store.json',
	);
	const outputPath = path.resolve(
		options.rootPath,
		options.outputPath ?? '.cache/sitemap-lastmod.json',
	);

	console.log(chalk.blue('Reading git log...'));

	const gitMap = await getGitFileDates({
		cwd: contentPathAbs,
		pathspec: 'collections/',
		keyPrefix: contentPathRelative,
	});

	console.log(chalk.blue('Loading data store...'));

	const { collections } = loadDataStore(dataStorePath);

	const urls: Record<string, string> = {};
	const contentPathPrefix = `${contentPathRelative}/collections/`;

	let resolvedCount = 0;
	let missingDateCount = 0;

	for (const [collectionName, collection] of collections) {
		for (const entry of collection.values()) {
			if (!entry.filePath?.startsWith(contentPathPrefix)) continue;

			const gitDate = gitMap.get(entry.filePath);

			if (!gitDate) {
				missingDateCount++;
				console.log(chalk.yellow(`  No git history: ${entry.filePath}`));
				continue;
			}

			const url = buildContentUrl(options.siteUrl, collectionName, getPublicId(entry));

			urls[url] = gitDate;
			resolvedCount++;
		}
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

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('sitemap-lastmod')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'content-path': { type: 'string', default: 'packages/content' },
			'data-store-path': { type: 'string', default: '.astro/data-store.json' },
			'output-path': { type: 'string', default: '.cache/sitemap-lastmod.json' },
			'site-url': { type: 'string' },
		},
	});

	const siteUrl = values['site-url'] ?? process.env.PROD_SERVER_URL;

	if (!siteUrl) {
		console.error(chalk.red('Missing site URL: pass --site-url or set PROD_SERVER_URL'));
		process.exit(1);
	}

	await generateSitemapLastmod({
		rootPath: findWorkspaceRoot(),
		siteUrl,
		contentPath: values['content-path'],
		dataStorePath: values['data-store-path'],
		outputPath: values['output-path'],
	});
}
