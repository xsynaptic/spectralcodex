import { openGraphBasePath, openGraphImageFormat } from '@spectralcodex/shared/open-graph';
import { getCachePaths } from '@spectralcodex/shared/paths';
import { getImageCachePaths } from '@xsynaptic/astro-image-pipeline/node';
import { imageFormats } from '@xsynaptic/astro-image-pipeline/presets';
import { readdir } from 'node:fs/promises';

import type { DeployConfig } from '#deploy/deploy-config.ts';
import type { ScriptPaths } from '#shared/cli-command.ts';

import { requestCloudflarePurge } from '#deploy/cloudflare-purge.ts';
import { describeRsyncSummary, rsyncTo } from '#deploy/rsync-exec.ts';
import { Refusal } from '#shared/cli-command.ts';
import { formatDuration, log } from '#shared/cli-output.ts';
import { createPurgeQueue } from '#shared/purge-queue.ts';

export interface RenderedSet {
	command: string;
	extensions: ReadonlyArray<string>;
	label: string;
	localPath: string;
	purge?: { baseUrl: string; queuePath: string };
	remotePath: string;
	title: string;
}

interface RenderedDeployOptions {
	config: DeployConfig;
	dryRun?: boolean;
}

const partialDirectory = '.rsync-partial';

// A truncated file at a served path would be cached at the edge for a year, so transfers land whole
export const renderedUploadOptions = {
	compress: false,
	excludes: ['*.tmp', '.DS_Store'],
	extraFlags: [
		'--mkpath',
		`--partial-dir=${partialDirectory}`,
		'--delay-updates',
		'--chmod=D755,F644',
	],
} as const;

export function getRenditionSet(paths: ScriptPaths, config: DeployConfig): RenderedSet {
	return {
		command: 'pnpm render-images',
		extensions: imageFormats,
		label: 'renditions',
		localPath: getImageCachePaths(paths.cachePath).renditionsPath,
		purge: {
			baseUrl: config.imageBaseUrl,
			queuePath: getCachePaths(paths.cachePath).imagePurgeQueuePath,
		},
		remotePath: config.imagesPath,
		title: 'Renditions',
	};
}

// The deploy's hostname purge already covers the site host, so cards need no queue of their own
export function getOpenGraphSet(paths: ScriptPaths, config: DeployConfig): RenderedSet {
	return {
		command: 'pnpm og-image',
		extensions: [openGraphImageFormat],
		label: 'OpenGraph images',
		localPath: getCachePaths(paths.cachePath).openGraphPath,
		remotePath: `${config.sitePath}/${openGraphBasePath}`,
		title: 'OpenGraph images',
	};
}

async function readLocalNames(localPath: string) {
	try {
		return await readdir(localPath, { recursive: true });
	} catch {
		return [];
	}
}

async function assertLocalFiles(set: RenderedSet) {
	const names = await readLocalNames(set.localPath);
	const hasFiles = names.some((name) =>
		set.extensions.some((extension) => name.endsWith(`.${extension}`)),
	);

	if (!hasFiles) {
		throw new Refusal(`No ${set.label} in ${set.localPath}; run \`${set.command}\` first`);
	}
}

async function purgeSet(set: RenderedSet, isDryRun: boolean) {
	if (set.purge === undefined) return;

	const queue = await createPurgeQueue(set.purge.queuePath);

	await queue.drain({
		baseUrl: set.purge.baseUrl,
		dryRun: isDryRun,
		label: set.label,
		request: requestCloudflarePurge,
	});
}

export async function uploadRenderedSet(
	set: RenderedSet,
	{ config, dryRun = false }: RenderedDeployOptions,
) {
	await assertLocalFiles(set);

	if (dryRun) log.warn('Dry run');

	const start = Date.now();

	const summary = await rsyncTo(`${set.localPath}/`, `${config.remoteHost}:${set.remotePath}/`, {
		...renderedUploadOptions,
		config,
		dryRun,
		label: `Uploading ${set.label}`,
	});

	log.success(
		`${set.title} uploaded · ${describeRsyncSummary(summary)} · ${formatDuration(Date.now() - start)}`,
	);

	await purgeSet(set, dryRun);
}
