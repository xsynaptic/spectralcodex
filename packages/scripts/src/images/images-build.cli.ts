#!/usr/bin/env tsx
import { createSourceFingerprints } from '@spectralcodex/shared/source-fingerprint';
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { buildImages } from '#images/images-build.ts';
import { engineVersions, getLocalImagePaths } from '#images/images-state.ts';
import { reportCliError } from '#shared/cli-error.ts';
import { findWorkspaceRoot, getLocalCachePath } from '#shared/utils.ts';

const rootPath = findWorkspaceRoot();
const { derivativesPath, statePath } = getLocalImagePaths(rootPath);

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'allow-mass-prune': { default: false, type: 'boolean' },
		'dist-path': { default: 'dist', type: 'string' },
		'media-path': {
			default: process.env.CONTENT_MEDIA_PATH || 'packages/content-demo/media',
			type: 'string',
		},
	},
});

const controller = new AbortController();

process.once('SIGINT', () => {
	console.log(chalk.yellow('\nStopping after the encodes in flight...'));
	controller.abort();
});

const start = Date.now();
let lastLog = start;

function logProgress({ done, total }: { done: number; total: number }) {
	if (Date.now() - lastLog < 10_000) return;

	lastLog = Date.now();
	console.log(chalk.gray(`${String(done)} / ${String(total)}`));
}

console.log(
	chalk.magenta(`=== Images (sharp ${engineVersions.sharp}, vips ${engineVersions.vips}) ===\n`),
);

try {
	const counts = await buildImages({
		derivativesPath,
		distPath: path.resolve(rootPath, values['dist-path']),
		fingerprints: createSourceFingerprints(getLocalCachePath(rootPath)),
		isMassPruneAllowed: values['allow-mass-prune'],
		mediaPath: path.resolve(rootPath, values['media-path']),
		onProgress: logProgress,
		signal: controller.signal,
		statePath,
	});
	const seconds = (Date.now() - start) / 1000;

	console.log(chalk.green(`Encoded: ${String(counts.encoded)} of ${String(counts.total)}`));
	console.log(chalk.blue(`Fresh: ${String(counts.fresh)}`));
	console.log(
		chalk.blue(`Written: ${String(counts.written)}, overwritten: ${String(counts.overwritten)}`),
	);
	if (counts.pruned > 0) console.log(chalk.yellow(`Pruned: ${String(counts.pruned)}`));
	if (counts.queued > 0) console.log(chalk.yellow(`Purge queue: ${String(counts.queued)} paths`));
	if (counts.isEngineChanged) {
		console.log(
			chalk.yellow(
				'The sharp build changed since the last run, so every derivative re-encoded; changed files upload and purge on the next deploy',
			),
		);
	}
	console.log(
		chalk.gray(
			`${seconds.toFixed(1)}s, ${(counts.encoded / Math.max(seconds, 1)).toFixed(1)} encodes/s`,
		),
	);
} catch (error) {
	reportCliError(
		error,
		controller.signal,
		'Interrupted; progress is saved and the next run resumes',
	);
}
