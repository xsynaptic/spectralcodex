#!/usr/bin/env tsx
import chalk from 'chalk';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { buildRedirectPairs } from '#generate-redirects/build-redirect-pairs.ts';
import { getCollectionEntries, withAstroContent } from '#shared/astro-content.ts';
import { findWorkspaceRoot } from '#shared/utils.ts';

const rootPath = findWorkspaceRoot();

const outputPath = path.join(rootPath, 'deploy/caddy/spectralcodex-redirects-generated.conf');

const entries = await withAstroContent((content) =>
	getCollectionEntries(content, [
		'locations',
		'posts',
		'pages',
		'themes',
		'series',
		'regions',
		'resources',
	]),
);

const { collisions, pairs: redirects, skipped } = buildRedirectPairs(entries);

// Writing the file anyway would ship a rule that takes a live page off the site
if (collisions.length > 0) {
	for (const collision of collisions) {
		console.error(chalk.red(`✗ former id collision: ${collision}`));
	}

	process.exit(1);
}

for (const note of skipped) {
	console.log(chalk.yellow(`⚠️  skipped ${note}`));
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
