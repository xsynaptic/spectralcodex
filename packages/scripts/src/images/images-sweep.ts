import type { ImageSweepFile } from '@xsynaptic/astro-image-pipeline/node';

import { imageBuildIdFile } from '@xsynaptic/astro-image-pipeline/node';
import { formatDuration, UserError } from '@xsynaptic/astro-scripts';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { partialDirectory } from '#deploy/deploy-images.ts';
import { sshCapture, sshExecWithInput } from '#deploy/rsync-exec.ts';

// Leftovers from renames and preset changes stay a few percent; more looks like a wrong keep list
export const sweepShareLimit = 0.1;

// Edge-held HTML references the outgoing build for `s-maxage` plus a day of `stale-while-revalidate`
export const sweepWaitMs = 2 * 24 * 60 * 60 * 1000;

export interface LiveBuild {
	buildId: string;
	liveAt: Date;
}

interface SweepCount {
	deletions: number;
	label: string;
	total: number;
}

export function getSweepRefusals({
	counts,
	live,
	now,
}: {
	counts: ReadonlyArray<SweepCount>;
	live: LiveBuild;
	now: Date;
}) {
	const refusals: Array<string> = [];
	const liveForMs = now.getTime() - live.liveAt.getTime();

	if (liveForMs < sweepWaitMs) {
		refusals.push(
			`build ${live.buildId} went live ${formatDuration(liveForMs)} ago, so edge-held pages may still reference the build before it`,
		);
	}

	for (const { deletions, label, total } of counts) {
		if (total === 0 || deletions / total <= sweepShareLimit) continue;

		refusals.push(
			`${label} would lose ${String(deletions)} of ${String(total)} files, over the ${String(sweepShareLimit * 100)}% limit`,
		);
	}

	return refusals;
}

export function parseRemoteListing(listing: string): Array<ImageSweepFile> {
	return listing
		.split('\n')
		.filter(Boolean)
		.flatMap((line) => {
			const [name, size] = line.split('\t', 2);

			if (name === undefined || size === undefined) return [];
			if (name.startsWith(`${partialDirectory}/`)) return [];

			return [{ name, size: Number(size) }];
		});
}

// The ctime moves when rsync renames the file into place, so it marks the deploy, not the build
async function readLiveBuildFile(config: DeployConfig) {
	try {
		return await sshCapture(
			config,
			`cd ${config.sitePath} && stat -c %Z ${imageBuildIdFile} && cat ${imageBuildIdFile}`,
		);
	} catch (error) {
		throw new UserError(`Could not read ${imageBuildIdFile} from ${config.sitePath}`, {
			cause: error,
		});
	}
}

export async function readLiveBuild(config: DeployConfig): Promise<LiveBuild> {
	const output = await readLiveBuildFile(config);
	const [changedAt, buildId] = output.trim().split('\n', 2);

	if (changedAt === undefined || !buildId) {
		throw new UserError(`${config.sitePath}/${imageBuildIdFile} is empty`);
	}

	return { buildId: buildId.trim(), liveAt: new Date(Number(changedAt) * 1000) };
}

export async function listRemoteFiles(config: DeployConfig) {
	const listing = await sshCapture(
		config,
		String.raw`cd ${config.imagesPath} && find . -type f -printf '%P\t%s\n'`,
	);

	return parseRemoteListing(listing);
}

export async function deleteRemoteFiles(
	config: DeployConfig,
	files: ReadonlyArray<ImageSweepFile>,
) {
	if (files.length === 0) return;

	await sshExecWithInput(
		config,
		String.raw`cd ${config.imagesPath} && xargs -r -d '\n' rm -f -- && find . -mindepth 1 -type d -empty -not -name ${partialDirectory} -delete`,
		files.map((file) => file.name).join('\n'),
	);
}
