import { openGraphBasePath } from '@spectralcodex/shared/open-graph';
import { log, withSpinner, withStep } from '@xsynaptic/astro-scripts';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { describeRsyncSummary, rsyncTo, sshExecWithInput } from '#deploy/rsync-exec.ts';

interface DeployAppOptions {
	dryRun?: boolean;
	rootPath: string;
	skipDelete?: boolean;
}

// Touch the current build first; a `--skip-build` dist can be older than the retention window
async function pruneStaleAssets(config: DeployConfig, distPath: string) {
	const assetNames = readdirSync(path.join(distPath, '_x'), { recursive: true });

	await withSpinner('Pruning stale assets', () =>
		sshExecWithInput(
			config,
			`cd ${config.sitePath}/_x && xargs -r touch -c && find . -type f -mtime +7 -delete`,
			assetNames.join('\n'),
		),
	);
}

export async function deployApp(options: DeployAppOptions): Promise<void> {
	const { dryRun = false, rootPath, skipDelete = false } = options;

	const config = loadDeployConfig();

	const distPath = path.join(rootPath, 'dist');

	if (dryRun) log.warn('Dry run');

	await withStep(
		'Uploading app',
		async () => {
			const summary = await rsyncTo(`${distPath}/`, `${config.remoteHost}:${config.sitePath}/`, {
				config,
				dryRun,
				excludes: [`/${openGraphBasePath}/`],
				extraFlags: skipDelete
					? ['--delay-updates']
					: ['--delay-updates', '--delete-after', '--filter=P /_x/**'],
				label: 'Transferring',
			});

			if (!skipDelete && !dryRun) await pruneStaleAssets(config, distPath);

			return summary;
		},
		(summary) => `App uploaded · ${describeRsyncSummary(summary)}`,
	);
}
