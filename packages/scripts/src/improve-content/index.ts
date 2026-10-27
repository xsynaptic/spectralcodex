import type { CollectionEntry } from 'astro:content';

import {
	formatCount,
	log,
	parseNumberOption,
	UserError,
	withAstroContent,
	withSpinner,
} from '@xsynaptic/astro-scripts';
import chalk from 'chalk';
import path from 'node:path';
import * as R from 'remeda';

import { checks } from '#improve-content/checks.ts';
import { defineCommand, runCommand } from '#shared/command.ts';

const randomDefaultLimit = 50;

const checkNames = Object.keys(checks).join(', ');

function formatEntryLine(entry: CollectionEntry<'locations'>, collectionsRoot: string): string {
	const displayPath = getDisplayPath(entry, collectionsRoot);
	const directory = path.dirname(displayPath);
	const filename = path.basename(displayPath);

	const formattedPath =
		directory === '.'
			? chalk.bold(filename)
			: chalk.dim(directory + path.sep) + chalk.bold(filename);

	const { title } = entry.data;

	return title ? `${formattedPath} ${chalk.dim('-')} ${title}` : formattedPath;
}

function getDisplayPath(entry: CollectionEntry<'locations'>, collectionsRoot: string): string {
	return path.relative(collectionsRoot, entry.filePath ?? entry.id);
}

function selectEntries(
	matched: Array<CollectionEntry<'locations'>>,
	{
		collectionsRoot,
		isRandom,
		limit,
	}: { collectionsRoot: string; isRandom: boolean; limit: number | undefined },
) {
	const ordered = isRandom ? R.shuffle(matched) : matched;
	const effectiveLimit = limit ?? (isRandom ? randomDefaultLimit : undefined);
	const selected = effectiveLimit === undefined ? ordered : ordered.slice(0, effectiveLimit);

	return selected.toSorted((a, b) =>
		getDisplayPath(a, collectionsRoot).localeCompare(getDisplayPath(b, collectionsRoot)),
	);
}

await runCommand(
	defineCommand({
		name: 'improve-content',
		options: {
			limit: { description: 'Show at most this many entries', type: 'string' },
			random: {
				default: false,
				description: `Shuffle the matches (shows ${String(randomDefaultLimit)} unless --limit is set)`,
				type: 'boolean',
			},
			threshold: {
				default: '100',
				description: 'Body length in characters under which an entry counts as a stub',
				type: 'string',
			},
		},
		positional: { description: `Check to run: ${checkNames}`, name: 'check' },
		async run({ paths, positionals, values }) {
			const [checkName] = positionals;

			if (!checkName) {
				log.info(`Available checks: ${checkNames}`);
				return;
			}

			const check = checks[checkName];

			if (!check) throw new UserError(`Unknown check "${checkName}"; choose from ${checkNames}`);

			const limit =
				values.limit === undefined ? undefined : parseNumberOption(values.limit, 'limit');
			const collectionsRoot = path.relative(paths.rootPath, paths.contentDataPath);

			const entries = await withSpinner('Loading content', () =>
				withAstroContent(({ getCollection }) => getCollection('locations')),
			);

			const matched = check(entries, {
				threshold: parseNumberOption(values.threshold, 'threshold'),
			});

			const selected = selectEntries(matched, {
				collectionsRoot,
				isRandom: values.random,
				limit,
			});

			for (const entry of selected) log.data(formatEntryLine(entry, collectionsRoot));

			if (matched.length === 0) {
				log.warn(`No entries matched (check: ${checkName})`);
				return;
			}

			log.info(
				`Showing ${formatCount(selected.length)} of ${formatCount(matched.length)} matched (check: ${checkName})`,
			);
		},
		summary: 'List Locations a content check flags for improvement, one per line on stdout',
		title: 'Improve content',
	}),
);
