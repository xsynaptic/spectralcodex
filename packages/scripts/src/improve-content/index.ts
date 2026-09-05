#!/usr/bin/env tsx
import type { CollectionEntry } from 'astro:content';

import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import * as R from 'remeda';

import { withAstroContent } from '#shared/astro-content.ts';

import { checks } from './checks.ts';

const collectionsRoot = path.join('packages', 'content', 'collections');

function getDisplayPath(entry: CollectionEntry<'locations'>): string {
	return path.relative(collectionsRoot, entry.filePath ?? entry.id);
}

function formatEntryLine(entry: CollectionEntry<'locations'>): string {
	const displayPath = getDisplayPath(entry);
	const directory = path.dirname(displayPath);
	const filename = path.basename(displayPath);

	const formattedPath =
		directory === '.'
			? chalk.bold(filename)
			: chalk.dim(directory + path.sep) + chalk.bold(filename);

	const { title } = entry.data;

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

const randomDefaultLimit = 50;

const explicitLimit = values.limit ? Number(values.limit) : undefined;
const effectiveLimit = explicitLimit ?? (values.random ? randomDefaultLimit : undefined);

const entries = await withAstroContent(({ getCollection }) => getCollection('locations'));

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
