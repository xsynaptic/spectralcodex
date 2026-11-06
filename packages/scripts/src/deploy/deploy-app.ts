import { openGraphBasePath } from '@spectralcodex/shared/open-graph';
import { log, withSpinner, withStep } from '@xsynaptic/astro-scripts';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { describeRsyncSummary, rsyncTo, sshExec, sshExecWithInput } from '#deploy/rsync-exec.ts';

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

// Directory naming from `@xsynaptic/astro-pagefind`
const pagefindVersionPattern = /^\d+\.\d+\.\d+/;

// The marker starts the 7-day clock when a version is replaced; rsync drops it if that version returns
async function pruneStalePagefindVersions(config: DeployConfig, distPath: string) {
	const versions = readdirSync(path.join(distPath, 'pagefind')).filter((entry) =>
		pagefindVersionPattern.test(entry),
	);
	const [currentVersion] = versions;

	if (currentVersion === undefined || versions.length > 1) {
		throw new Error(`Expected one Pagefind version in dist, found: ${versions.join(', ')}`);
	}

	await withSpinner('Pruning stale Pagefind versions', () =>
		sshExec(
			config,
			[
				`cd ${config.sitePath}/pagefind || exit 1`,
				`for dir in [0-9]*; do [ -d "$dir" ] && [ "$dir" != ${currentVersion} ] && [ ! -e "$dir/.superseded" ] && touch "$dir/.superseded"; done`,
				`find . -mindepth 2 -maxdepth 2 -name .superseded -mtime +7 -exec sh -c 'rm -rf "$(dirname "$1")"' _ {} \\;`,
			].join('; '),
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
					: [
							'--delay-updates',
							'--delete-after',
							'--filter=P /_x/**',
							'--filter=P /pagefind/[0-9]*/',
						],
				label: 'Transferring',
			});

			if (!skipDelete && !dryRun) {
				await pruneStaleAssets(config, distPath);
				await pruneStalePagefindVersions(config, distPath);
			}

			return summary;
		},
		(summary) => `App uploaded · ${describeRsyncSummary(summary)}`,
	);
}
