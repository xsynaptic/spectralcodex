#!/usr/bin/env tsx
/**
 * Surface content entries with room for improvement.
 */
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as R from 'remeda';

import type { DataStoreEntry } from '../shared/data-store';

import { getDataStoreCollection, getDataStorePath, loadDataStore } from '../shared/data-store';
import { findWorkspaceRoot } from '../shared/utils.js';
import { checks } from './checks';

const rootPath = findWorkspaceRoot();

const RANDOM_DEFAULT_LIMIT = 50;
const COLLECTIONS_ROOT = path.join('packages', 'content', 'collections');

function getDisplayPath(entry: DataStoreEntry): string {
	return path.relative(COLLECTIONS_ROOT, entry.filePath ?? entry.id);
}

function formatEntryLine(entry: DataStoreEntry): string {
	const displayPath = getDisplayPath(entry);
	const directory = path.dirname(displayPath);
	const filename = path.basename(displayPath);

	const formattedPath =
		directory === '.'
			? chalk.bold(filename)
			: chalk.dim(directory + path.sep) + chalk.bold(filename);

	const title = typeof entry.data.title === 'string' ? entry.data.title : undefined;

	return title ? `${formattedPath} ${chalk.dim('-')} ${title}` : formattedPath;
}

function printAvailableChecks(stream: 'stdout' | 'stderr') {
	const log = stream === 'stdout' ? console.log : console.error;

	log(chalk.bold('Available checks:'));

	for (const name of Object.keys(checks)) {
		log(`  ${chalk.cyan(name)}`);
	}
}

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'data-store-path': {
			type: 'string',
			default: getDataStorePath(),
		},
		limit: {
			type: 'string',
		},
		random: {
			type: 'boolean',
			default: false,
		},
		threshold: {
			type: 'string',
			default: '100',
		},
	},
	allowPositionals: true,
});

const checkName = positionals[0];

if (!checkName) {
	printAvailableChecks('stdout');
	process.exit(0);
}

const check = checks[checkName];

if (!check) {
	console.error(chalk.red(`Unknown check: "${checkName}"`));
	printAvailableChecks('stderr');
	process.exit(1);
}

const explicitLimit = values.limit ? Number(values.limit) : undefined;
const effectiveLimit = explicitLimit ?? (values.random ? RANDOM_DEFAULT_LIMIT : undefined);

const dataStorePath = path.join(rootPath, values['data-store-path']);
const { collections } = loadDataStore(dataStorePath);

const entries = getDataStoreCollection(collections, ['locations']);

const matched = check(entries, { threshold: Number(values.threshold) });

let selected = values.random ? R.shuffle(matched) : matched;

if (effectiveLimit !== undefined) {
	selected = selected.slice(0, effectiveLimit);
}

selected.sort((a, b) => getDisplayPath(a).localeCompare(getDisplayPath(b)));

for (const entry of selected) {
	console.log(formatEntryLine(entry));
}

if (matched.length === 0) {
	console.error(chalk.yellow(`\nNo entries matched (check: ${chalk.cyan(checkName)})`));
} else {
	console.error(
		chalk.dim(
			`\nShowing ${String(selected.length)} of ${String(matched.length)} matched (check: ${checkName})`,
		),
	);
}
