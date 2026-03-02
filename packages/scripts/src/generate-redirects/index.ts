#!/usr/bin/env tsx
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { getDataStoreCollection, loadDataStore } from '../shared/data-store';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': {
			type: 'string',
			default: process.cwd(),
		},
		'data-store-path': {
			type: 'string',
			default: '.astro/data-store.json',
		},
	},
});

const rootPath = values['root-path'];
const dataStorePath = path.join(rootPath, values['data-store-path']);
const outputPath = path.join(
	rootPath,
	'deploy/site/caddy/sites/spectralcodex-redirects-generated.conf',
);

const { collections } = loadDataStore(dataStorePath);

interface RedirectPair {
	fromPath: string;
	toPath: string;
}

// Collections where page URL = /{slug}/
const FLAT_COLLECTIONS = ['locations', 'posts', 'ephemera', 'pages'];

// Collections where page URL = /{collection}/{id}/
const PREFIXED_COLLECTIONS: Record<string, string> = {
	themes: 'themes',
	series: 'series',
	regions: 'regions',
	resources: 'resources',
};

const redirects: Array<RedirectPair> = [];

for (const collectionName of [...FLAT_COLLECTIONS, ...Object.keys(PREFIXED_COLLECTIONS)]) {
	const entries = getDataStoreCollection(collections, collectionName);

	for (const entry of entries) {
		const formerSlugs = entry.data.formerSlugs as Array<string> | undefined;

		if (!formerSlugs?.length) continue;

		const prefix = PREFIXED_COLLECTIONS[collectionName];

		for (const formerSlug of formerSlugs) {
			const formerPath = prefix ? `/${prefix}/${formerSlug}/` : `/${formerSlug}/`;
			const currentPath = prefix ? `/${prefix}/${entry.id}/` : `/${entry.id}/`;

			// Page redirect
			redirects.push({ fromPath: formerPath, toPath: currentPath });
			// OG image redirect
			redirects.push({ fromPath: `/og/${formerSlug}.jpg`, toPath: `/og/${entry.id}.jpg` });
		}
	}
}

if (redirects.length === 0) {
	console.log(chalk.yellow('No formerSlugs found, writing empty redirect file'));
	writeFileSync(outputPath, '# Auto-generated redirects (none found)\n');
} else {
	const lines = ['# Auto-generated redirects from formerSlugs — do not edit manually', ''];

	for (const { fromPath, toPath } of redirects) {
		lines.push(`redir ${fromPath} ${toPath} 301`);
	}

	lines.push('');
	writeFileSync(outputPath, lines.join('\n'));
	console.log(chalk.green(`Generated ${redirects.length} redirects → ${outputPath}`));
}
