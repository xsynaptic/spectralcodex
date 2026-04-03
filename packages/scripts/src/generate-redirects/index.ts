#!/usr/bin/env tsx
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { getDataStoreCollection, getPublicId, loadDataStore } from '../shared/data-store';

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

// Collections where page URL = /{id}/
const FLAT_COLLECTIONS = ['locations', 'posts', 'notes', 'pages'];

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
		const formerIds = entry.data.formerIds as Array<string> | undefined;

		if (!formerIds?.length) continue;

		const prefix = PREFIXED_COLLECTIONS[collectionName];
		const canonicalId = getPublicId(entry);

		for (const formerId of formerIds) {
			const formerPath = prefix ? `/${prefix}/${formerId}/` : `/${formerId}/`;
			const currentPath = prefix ? `/${prefix}/${canonicalId}/` : `/${canonicalId}/`;

			// Page redirect
			redirects.push(
				{ fromPath: formerPath, toPath: currentPath },
				{ fromPath: `/og/${formerId}.jpg`, toPath: `/og/${canonicalId}.jpg` },
			);
		}
	}
}

if (redirects.length === 0) {
	console.log(chalk.yellow('No formerIds found, writing empty redirect file'));
	writeFileSync(outputPath, '# Auto-generated redirects (none found)\n');
} else {
	const lines = ['# Auto-generated redirects from formerIds; do not edit manually', ''];

	for (const { fromPath, toPath } of redirects) {
		lines.push(`redir ${fromPath} ${toPath} 301`);
	}

	lines.push('');
	writeFileSync(outputPath, lines.join('\n'));
	console.log(chalk.green(`Generated ${String(redirects.length)} redirects → ${outputPath}`));
}
