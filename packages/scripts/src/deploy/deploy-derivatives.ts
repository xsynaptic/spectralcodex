import { imageQualityByFormat } from '@spectralcodex/shared/images';
import {
	openGraphBasePath,
	openGraphImageFormat,
	openGraphOutputPath,
	openGraphStatePath,
} from '@spectralcodex/shared/open-graph';
import chalk from 'chalk';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { purgeQueuedFiles } from '#deploy/deploy-purge.ts';
import { rsyncTo } from '#deploy/rsync-exec.ts';
import { getLocalImagePaths } from '#images/images-state.ts';
import { Refusal } from '#shared/cli-error.ts';
import { getMassPruneLimit, listFileCacheFiles } from '#shared/file-cache.ts';
import { createPurgeQueue } from '#shared/purge-queue.ts';

export interface DerivativeSet {
	command: string;
	extensions: ReadonlyArray<string>;
	label: string;
	localPath: string;
	purgeBaseUrl?: string;
	remotePath: string;
	statePath: string;
}

interface DerivativeDeployOptions {
	config: DeployConfig;
	dryRun?: boolean;
}

const partialDirectory = '.rsync-partial';

// A truncated file at a served path would be cached at the edge for a year, so transfers land whole
export const derivativeUploadOptions = {
	archive: 'av',
	excludes: ['*.tmp', '.DS_Store'],
	extraFlags: [
		'--mkpath',
		`--partial-dir=${partialDirectory}`,
		'--delay-updates',
		'--chmod=D755,F644',
	],
	isProgressShown: false,
} as const;

// `--existing` with `--ignore-existing` sends nothing, so the run only deletes
export const derivativePruneOptions = {
	...derivativeUploadOptions,
	excludes: [...derivativeUploadOptions.excludes, `${partialDirectory}/`],
	extraFlags: ['--delete', '--existing', '--ignore-existing', '--itemize-changes'],
};

export function getImageSet(rootPath: string, config: DeployConfig): DerivativeSet {
	const { derivativesPath, statePath } = getLocalImagePaths(rootPath);

	return {
		command: 'pnpm images',
		extensions: Object.keys(imageQualityByFormat),
		label: 'image derivatives',
		localPath: derivativesPath,
		purgeBaseUrl: config.imageBaseUrl,
		remotePath: config.imagesPath,
		statePath,
	};
}

// The deploy's hostname purge already covers the site host, so cards need no queue of their own
export function getOpenGraphSet(rootPath: string, config: DeployConfig): DerivativeSet {
	return {
		command: 'pnpm og-image',
		extensions: [openGraphImageFormat],
		label: 'OpenGraph cards',
		localPath: path.join(rootPath, openGraphOutputPath),
		remotePath: `${config.sitePath}/${openGraphBasePath}`,
		statePath: path.join(rootPath, openGraphStatePath),
	};
}

async function listLocalFiles(set: DerivativeSet) {
	const files = await listFileCacheFiles(set.localPath, set.extensions);

	if (files.length === 0) {
		throw new Refusal(`No ${set.label} in ${set.localPath}; run \`${set.command}\` first`);
	}

	return files;
}

export function getDeletedPaths(rsyncOutput: string) {
	return rsyncOutput.split('\n').flatMap((line) => {
		const deletedPath = /^\*deleting +(?<path>.+)$/.exec(line)?.groups?.path;

		return deletedPath && !deletedPath.endsWith('/') ? [deletedPath] : [];
	});
}

async function isPruneConfirmed(message: string) {
	if (!process.stdin.isTTY) return false;

	const prompt = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await prompt.question(message);

	prompt.close();

	return answer.trim() === 'prune';
}

async function purgeSet(set: DerivativeSet, isDryRun: boolean, deletedPaths: Array<string> = []) {
	if (set.purgeBaseUrl === undefined) return;

	const queue = await createPurgeQueue(set.statePath);

	for (const deletedPath of deletedPaths) await queue.add(deletedPath);

	await purgeQueuedFiles({
		baseUrl: set.purgeBaseUrl,
		dryRun: isDryRun,
		label: set.label,
		statePath: set.statePath,
	});
}

function assertPruneLimit(
	set: DerivativeSet,
	{ count, fileCount, isAllowed }: { count: number; fileCount: number; isAllowed: boolean },
) {
	const limit = getMassPruneLimit(fileCount);

	if (isAllowed || count <= limit) return;

	throw new Refusal(
		`Refusing to delete ${String(count)} remote ${set.label} (limit ${String(limit)}); pass --allow-mass-prune if the local cache is right`,
	);
}

export async function uploadDerivatives(
	set: DerivativeSet,
	{ config, dryRun = false }: DerivativeDeployOptions,
) {
	const files = await listLocalFiles(set);
	const destination = `${config.remoteHost}:${set.remotePath}/`;

	console.log(chalk.blue(`Syncing ${set.label}...`));
	console.log(chalk.gray(`  From: ${set.localPath}/ (${String(files.length)} files)`));
	console.log(chalk.gray(`  To:   ${destination}`));
	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	await rsyncTo(`${set.localPath}/`, destination, { ...derivativeUploadOptions, config, dryRun });

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));

	await purgeSet(set, dryRun);
}

export async function pruneRemoteDerivatives(
	set: DerivativeSet,
	{
		config,
		dryRun = false,
		isMassPruneAllowed = false,
	}: DerivativeDeployOptions & { isMassPruneAllowed?: boolean },
) {
	const files = await listLocalFiles(set);
	const source = `${set.localPath}/`;
	const destination = `${config.remoteHost}:${set.remotePath}/`;
	const pruneOptions = { ...derivativePruneOptions, config };

	console.log(chalk.blue(`Listing remote ${set.label} absent from ${source}...`));

	const planned = getDeletedPaths(
		await rsyncTo(source, destination, { ...pruneOptions, dryRun: true }),
	);

	if (planned.length === 0) {
		console.log(chalk.green('Nothing to prune'));
		return;
	}

	assertPruneLimit(set, {
		count: planned.length,
		fileCount: files.length + planned.length,
		isAllowed: isMassPruneAllowed,
	});

	console.log(
		chalk.yellow(`${String(planned.length)} remote files will be deleted (listed above)`),
	);

	if (dryRun) {
		console.log(chalk.yellow('  DRY RUN'));
		return;
	}

	if (!(await isPruneConfirmed('Type "prune" to delete them: '))) {
		console.log(chalk.yellow('Not confirmed; nothing deleted'));
		return;
	}

	const deleted = getDeletedPaths(await rsyncTo(source, destination, pruneOptions));

	console.log(chalk.green(`Deleted ${String(deleted.length)} remote ${set.label}`));

	await purgeSet(set, false, deleted);
}
