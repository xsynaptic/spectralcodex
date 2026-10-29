import type { ImageSweepFile } from '@xsynaptic/astro-image-pipeline/node';

import { getCachePaths } from '@spectralcodex/shared/paths';
import { prepareImageSweep } from '@xsynaptic/astro-image-pipeline/node';
import { formatBytes, formatCount, log, UserError, withSpinner } from '@xsynaptic/astro-scripts';
import * as R from 'remeda';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { ensureSshKeychain } from '#deploy/rsync-exec.ts';
import {
	deleteRemoteFiles,
	getSweepRefusals,
	listRemoteFiles,
	readLiveBuild,
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
		const live = await withSpinner('Reading the live build', () => readLiveBuild(config));
		const sweep = await withSpinner('Reading the cache', () =>
			prepareImageSweep({ cachePath: imagesPath, keep: [live.buildId] }),
		);
		const remoteFiles = await withSpinner('Listing the image host', () => listRemoteFiles(config));
		const remoteDeletions = remoteFiles.filter((file) => !sweep.keep.has(file.name));

		log.summary([
			['Live build', live.buildId],
			['Live since', live.liveAt.toISOString()],
			['Kept names', sweep.keep.size],
			['Local files', sweep.total],
			['Local deletions', describeFiles(sweep.deletions)],
			['Remote files', remoteFiles.length],
			['Remote deletions', describeFiles(remoteDeletions)],
		]);
		logSample('Local deletions', sweep.deletions);
		logSample('Remote deletions', remoteDeletions);

		const refusals = getSweepRefusals({
			counts: [
				{ deletions: sweep.deletions.length, label: 'The cache', total: sweep.total },
				{ deletions: remoteDeletions.length, label: 'The image host', total: remoteFiles.length },
			],
			live,
			now: new Date(),
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

		// Local first: an upload only adds, so a rendition left here would return on the next deploy
		const result = await withSpinner('Sweeping the cache', () => sweep.run());
		const remoteSwept = remoteFiles.filter((file) => !result.keep.has(file.name));

		await withSpinner('Sweeping the image host', () => deleteRemoteFiles(config, remoteSwept));

		log.summary([
			['Local deleted', describeFiles(result.deletions)],
			['Remote deleted', describeFiles(remoteSwept)],
			['Manifests dropped', result.droppedBuilds.length],
		]);
	},
	summary: 'Delete renditions neither the live build nor the newest build references',
	title: 'Sweep images',
});
