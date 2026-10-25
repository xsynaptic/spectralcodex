import { openGraphBasePath, openGraphImageFormat } from '@spectralcodex/shared/open-graph';
import { getCachePaths } from '@spectralcodex/shared/paths';
import {
	assertPruneLimit,
	getImageCachePaths,
	listFileCacheFiles,
} from '@xsynaptic/astro-image-pipeline/node';
import { imageFormats } from '@xsynaptic/astro-image-pipeline/presets';

import type { DeployConfig } from '#deploy/deploy-config.ts';
import type { ScriptPaths } from '#shared/cli-command.ts';

import { requestCloudflarePurge } from '#deploy/cloudflare-purge.ts';
import { rsyncTo } from '#deploy/rsync-exec.ts';
import { Refusal } from '#shared/cli-command.ts';
import { formatCount, formatDuration, log } from '#shared/cli-output.ts';
import { isPhraseConfirmed } from '#shared/cli-prompt.ts';
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

export function getImageSet(paths: ScriptPaths, config: DeployConfig): DerivativeSet {
	const { filesPath, statePath } = getImageCachePaths(paths.cachePath);

	return {
		command: 'pnpm render-images',
		extensions: imageFormats,
		label: 'images',
		localPath: filesPath,
		purgeBaseUrl: config.imageBaseUrl,
		remotePath: config.imagesPath,
		statePath,
	};
}

// The deploy's hostname purge already covers the site host, so cards need no queue of their own
export function getOpenGraphSet(paths: ScriptPaths, config: DeployConfig): DerivativeSet {
	return {
		command: 'pnpm og-image',
		extensions: [openGraphImageFormat],
		label: 'OpenGraph images',
		localPath: getCachePaths(paths.cachePath).openGraphPath,
		remotePath: `${config.sitePath}/${openGraphBasePath}`,
		statePath: getCachePaths(paths.cachePath).openGraphStatePath,
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

async function purgeSet(set: DerivativeSet, isDryRun: boolean, deletedPaths: Array<string> = []) {
	if (set.purgeBaseUrl === undefined) return;

	const queue = await createPurgeQueue(set.statePath);

	for (const deletedPath of deletedPaths) await queue.add(deletedPath);

	await queue.drain({
		baseUrl: set.purgeBaseUrl,
		dryRun: isDryRun,
		label: set.label,
		request: requestCloudflarePurge,
	});
}

export async function uploadDerivatives(
	set: DerivativeSet,
	{ config, dryRun = false }: DerivativeDeployOptions,
) {
	const files = await listLocalFiles(set);
	const destination = `${config.remoteHost}:${set.remotePath}/`;

	log.step(`Deploying ${set.label}...`);
	log.detail(`From: ${set.localPath}/ (${formatCount(files.length)} files)`);
	log.detail(`To:   ${destination}`);
	if (dryRun) log.warn('Dry run');

	const start = Date.now();

	await rsyncTo(`${set.localPath}/`, destination, { ...derivativeUploadOptions, config, dryRun });

	log.success(`Deployed ${set.label} in ${formatDuration(Date.now() - start)}`);

	await purgeSet(set, dryRun);
}

export async function pruneRemoteDerivatives(
	set: DerivativeSet,
	{
		config,
		dryRun = false,
		isMassPruneAllowed = false,
		signal,
	}: DerivativeDeployOptions & { isMassPruneAllowed?: boolean; signal: AbortSignal },
) {
	const files = await listLocalFiles(set);
	const source = `${set.localPath}/`;
	const destination = `${config.remoteHost}:${set.remotePath}/`;
	const pruneOptions = { ...derivativePruneOptions, config };

	log.step(`Listing remote ${set.label} absent from ${source}...`);

	const planned = getDeletedPaths(
		await rsyncTo(source, destination, { ...pruneOptions, dryRun: true }),
	);

	if (planned.length === 0) {
		log.success('Nothing to prune');
		return;
	}

	assertPruneLimit({
		count: planned.length,
		isAllowed: isMassPruneAllowed,
		subject: `remote ${set.label}`,
		total: files.length + planned.length,
	});

	log.warn(`${formatCount(planned.length)} remote files will be deleted (listed above)`);

	if (dryRun) {
		log.warn('Dry run; nothing deleted');
		return;
	}

	const isConfirmed = await isPhraseConfirmed({
		message: `Delete ${formatCount(planned.length)} remote ${set.label}?`,
		phrase: 'prune',
		signal,
	});

	if (!isConfirmed) {
		log.warn('Not confirmed; nothing deleted');
		return;
	}

	const deleted = getDeletedPaths(await rsyncTo(source, destination, pruneOptions));

	log.success(`Deleted ${formatCount(deleted.length)} remote ${set.label}`);

	await purgeSet(set, false, deleted);
}
