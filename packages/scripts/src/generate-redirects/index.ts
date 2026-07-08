#!/usr/bin/env tsx
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { DATA_STORE_PATH, loadDataStore } from '../shared/data-store';
import { findWorkspaceRoot } from '../shared/utils.js';
import { buildRedirectPairs } from './build-redirect-pairs';

const rootPath = findWorkspaceRoot();

const dataStorePath = path.join(rootPath, DATA_STORE_PATH);
const outputPath = path.join(rootPath, 'deploy/caddy/spectralcodex-redirects-generated.conf');

const { collections } = loadDataStore(dataStorePath);

const redirects = buildRedirectPairs(collections);

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
