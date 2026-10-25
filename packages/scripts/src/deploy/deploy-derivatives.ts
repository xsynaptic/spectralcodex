import { openGraphBasePath, openGraphImageFormat } from '@spectralcodex/shared/open-graph';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { getImageCachePaths } from '@xsynaptic/astro-image-pipeline/node';
import { imageFormats } from '@xsynaptic/astro-image-pipeline/presets';
import { readdir } from 'node:fs/promises';

import type { DeployConfig } from '#deploy/deploy-config.ts';
import type { ScriptPaths } from '#shared/cli-command.ts';

import { requestCloudflarePurge } from '#deploy/cloudflare-purge.ts';
import { rsyncTo } from '#deploy/rsync-exec.ts';
import { Refusal } from '#shared/cli-command.ts';
import { formatCount, formatDuration, log } from '#shared/cli-output.ts';
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

async function readLocalNames(localPath: string) {
	try {
		return await readdir(localPath, { recursive: true });
	} catch {
		return [];
	}
}

async function countLocalFiles(set: DerivativeSet) {
	const names = await readLocalNames(set.localPath);
	const count = names.filter((name) =>
		set.extensions.some((extension) => name.endsWith(`.${extension}`)),
	).length;

	if (count === 0) {
		throw new Refusal(`No ${set.label} in ${set.localPath}; run \`${set.command}\` first`);
	}

	return count;
}

async function purgeSet(set: DerivativeSet, isDryRun: boolean) {
	if (set.purgeBaseUrl === undefined) return;

	const queue = await createPurgeQueue(set.statePath);

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
	const fileCount = await countLocalFiles(set);
	const destination = `${config.remoteHost}:${set.remotePath}/`;

	log.step(`Deploying ${set.label}...`);
	log.detail(`From: ${set.localPath}/ (${formatCount(fileCount)} files)`);
	log.detail(`To:   ${destination}`);
	if (dryRun) log.warn('Dry run');

	const start = Date.now();

	await rsyncTo(`${set.localPath}/`, destination, { ...derivativeUploadOptions, config, dryRun });

	log.success(`Deployed ${set.label} in ${formatDuration(Date.now() - start)}`);

	await purgeSet(set, dryRun);
}
