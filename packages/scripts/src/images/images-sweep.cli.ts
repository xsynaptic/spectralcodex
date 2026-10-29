import type { ImageSweepFile } from '@xsynaptic/astro-image-pipeline/node';

import { getCachePaths } from '@spectralcodex/shared/paths';
import { prepareImageSweep } from '@xsynaptic/astro-image-pipeline/node';
import { formatBytes, formatCount, log, UserError, withSpinner } from '@xsynaptic/astro-scripts';
import * as R from 'remeda';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { getOpenGraphSet, getRenditionSet } from '#deploy/deploy-images.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import {
	deleteRemoteFiles,
	getRemoteDeletions,
	getSweepRefusals,
	listLocalNames,
	listRemoteFiles,
	readLiveBuild,
	sweepRetentionDays,
	sweepShareLimit,
} from '#images/images-sweep.ts';
import { runCommand } from '#shared/command.ts';

const sampleSize = 10;

function describeFiles(files: ReadonlyArray<ImageSweepFile>) {
	return `${formatCount(files.length)} (${formatBytes(R.sumBy(files, (file) => file.size))})`;
}

function logSample(label: string, files: ReadonlyArray<ImageSweepFile>) {
	if (files.length === 0) return;

	log.step(`${label}, first ${String(Math.min(sampleSize, files.length))}:`);

	for (const file of files.slice(0, sampleSize)) log.detail(file.name);
}

await runCommand({
	name: 'sweep-images',
	options: {
		'dry-run': {
			default: false,
			description: 'List what would be deleted, locally and on the server',
			type: 'boolean',
		},
		force: {
			default: false,
			description: `Sweep past the ${String(sweepShareLimit * 100)}% limit and the two-day wait after a deploy`,
			type: 'boolean',
		},
	},
	async run({ paths, values }) {
		await ensureSshKeychain();

		const config = loadDeployConfig();
		const { imagesPath } = getCachePaths(paths.cachePath);
		const now = new Date();
		const live = await withSpinner('Reading the live build', () => readLiveBuild(config));
		const sweep = await withSpinner('Reading the store', () =>
			prepareImageSweep({
				live: live.buildId,
				retentionDays: sweepRetentionDays,
				storePath: imagesPath,
			}),
		);
		const kinds = await withSpinner('Listing the image hosts', () =>
			Promise.all(
				[
					{ key: 'renditions' as const, label: 'Renditions', set: getRenditionSet(paths, config) },
					{ key: 'cards' as const, label: 'Cards', set: getOpenGraphSet(paths, config) },
				].map(async (kind) => {
					const plan = sweep[kind.key];
					const remoteFiles = await listRemoteFiles(config, kind.set.remotePath);
					const localNames = await listLocalNames(plan.directory);
					const retentionDays = sweepRetentionDays[kind.key];

					return {
						...kind,
						localNames,
						plan,
						remoteDeletions: getRemoteDeletions({
							deletions: plan.deletions,
							localNames,
							now,
							remoteFiles,
							retentionDays,
						}),
						remoteFiles,
						retentionDays,
					};
				}),
			),
		);

		log.summary([
			['Live build', live.buildId],
			['Live since', live.liveAt.toISOString()],
			...kinds.flatMap(
				({ label, plan, remoteDeletions, remoteFiles }): Array<[string, number | string]> => [
					[`${label}, local`, plan.total],
					[`${label}, local deletions`, describeFiles(plan.deletions)],
					[`${label}, remote`, remoteFiles.length],
					[`${label}, remote deletions`, describeFiles(remoteDeletions)],
				],
			),
		]);

		for (const { label, plan, remoteDeletions } of kinds) {
			logSample(`${label}, local deletions`, plan.deletions);
			logSample(`${label}, remote deletions`, remoteDeletions);
		}

		const refusals = getSweepRefusals({
			counts: kinds.flatMap(({ label, plan, remoteDeletions, remoteFiles }) => [
				{ deletions: plan.deletions.length, label: `${label} in the store`, total: plan.total },
				{
					deletions: remoteDeletions.length,
					label: `${label} on the server`,
					total: remoteFiles.length,
				},
			]),
			live,
			now,
		});

		if (values['dry-run']) {
			for (const refusal of refusals) log.warn(`A real run would refuse: ${refusal}`);

			log.warn('Dry run; nothing deleted');
			return;
		}

		if (refusals.length > 0 && !values.force) {
			throw new UserError(`Refusing to sweep: ${refusals.join('; ')}`, {
				detail: 'Check the dry run, then pass --force if the deletions are right',
			});
		}

		// Local first: an upload only adds, so a file left here would return on the next deploy
		const result = await withSpinner('Sweeping the store', () => sweep.run());
		const rows: Array<[string, number | string]> = [];

		for (const { key, label, localNames, remoteFiles, retentionDays, set } of kinds) {
			const files = getRemoteDeletions({
				deletions: result[key].deletions,
				localNames,
				now,
				remoteFiles,
				retentionDays,
			});

			await withSpinner(`Sweeping ${label.toLowerCase()} on the server`, () =>
				deleteRemoteFiles(config, set.remotePath, files),
			);

			rows.push(
				[`${label}, local deleted`, describeFiles(result[key].deletions)],
				[`${label}, remote deleted`, describeFiles(files)],
			);
		}

		log.summary([...rows, ['Manifests dropped', result.droppedBuilds.length]]);
	},
	summary: 'Delete renditions and cards past their window that no kept build names',
	title: 'Sweep images',
});
