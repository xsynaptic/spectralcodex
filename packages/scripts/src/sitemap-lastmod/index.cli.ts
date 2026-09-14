#!/usr/bin/env tsx
import { sitemapLastmodPath } from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import { parseArgs } from 'node:util';

import { findWorkspaceRoot } from '#shared/utils.ts';
import { generateSitemapLastmod } from '#sitemap-lastmod/index.ts';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'content-path': { default: 'packages/content', type: 'string' },
		'output-path': { default: sitemapLastmodPath, type: 'string' },
		'site-url': { type: 'string' },
	},
});

const siteUrl = values['site-url'] ?? process.env.PROD_SERVER_URL;

if (!siteUrl) {
	console.error(chalk.red('Missing site URL: pass --site-url or set PROD_SERVER_URL'));
	process.exit(1);
}

await generateSitemapLastmod({
	contentPath: values['content-path'],
	outputPath: values['output-path'],
	rootPath: findWorkspaceRoot(),
	siteUrl,
});
