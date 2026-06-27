#!/usr/bin/env tsx
import chalk from 'chalk';
import { parseArgs } from 'node:util';

import { getDataStorePath } from '../shared/data-store.js';
import { findWorkspaceRoot } from '../shared/utils.js';
import { generateSitemapLastmod } from './index.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'content-path': { type: 'string', default: 'packages/content' },
		'data-store-path': { type: 'string', default: getDataStorePath() },
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
