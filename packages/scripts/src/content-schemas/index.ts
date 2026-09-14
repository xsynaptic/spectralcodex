#!/usr/bin/env tsx
import chalk from 'chalk';
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { findWorkspaceRoot } from '#shared/utils.ts';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'output-path': {
			type: 'string',
			default: 'content',
		},
	},
});

if (!values['output-path']) {
	console.error('Usage: pnpm run content-schemas --output-path=<output-path>');
	process.exit(1);
}

// Written by `astro sync`, one JSON schema per collection
const schemaDir = '.astro/collections';

const sourcePath = path.resolve(rootPath, schemaDir);
const targetPath = path.resolve(rootPath, values['output-path'], 'schemas');

const schemaFiles = readdirSync(sourcePath).filter((file) => file.endsWith('.schema.json'));

if (schemaFiles.length === 0) {
	console.error(chalk.red(`✗ no schemas in ${schemaDir}; run \`astro sync\` first`));
	process.exit(1);
}

mkdirSync(targetPath, { recursive: true });

for (const file of schemaFiles) {
	copyFileSync(path.join(sourcePath, file), path.join(targetPath, file));
}

console.log(chalk.green(`✓ ${schemaFiles.length.toString()} schemas → ${targetPath}`));
