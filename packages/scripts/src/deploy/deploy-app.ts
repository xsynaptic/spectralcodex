import { openGraphBasePath } from '@spectralcodex/shared/open-graph';
import { getAstroPaths, log, withSpinner, withStep } from '@xsynaptic/astro-scripts';
import { readdirSync } from 'node:fs';
import path from 'node:path';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import {
	describeRsyncSummary,
	rsyncTo,
	sshCapture,
	sshExec,
	sshExecWithInput,
} from '#deploy/rsync-exec.ts';

interface DeployAppOptions {
	dryRun?: boolean;
	skipDelete?: boolean;
}

export const retentionDays = 7;

const assetLedgerName = '.superseded';

const ledgerSecondsPattern = /^\d{10}$/;

interface AssetRetentionInput {
	currentNames: ReadonlySet<string>;
	ledger: string;
	now: Date;
	remoteNames: ReadonlyArray<string>;
}

function readAssetLedger(ledger: string, nowSeconds: number) {
	const supersededAt = new Map<string, number>();

	for (const line of ledger.split('\n')) {
		const [name, field] = line.split('\t', 2);

		if (!name || field === undefined || !ledgerSecondsPattern.test(field)) continue;

		const seconds = Number(field);

		if (seconds > nowSeconds) continue;

		supersededAt.set(name, seconds);
	}

	return supersededAt;
}

export function planAssetRetention({
	currentNames,
	ledger,
	now,
	remoteNames,
}: AssetRetentionInput) {
	const nowSeconds = Math.floor(now.getTime() / 1000);
	const supersededAt = readAssetLedger(ledger, nowSeconds);

	const cutoffSeconds = nowSeconds - retentionDays * 24 * 60 * 60;
	const deletions: Array<string> = [];
	const ledgerLines: Array<string> = [];

	for (const name of remoteNames) {
		if (currentNames.has(name)) continue;

		const replacedAt = supersededAt.get(name) ?? nowSeconds;

		if (replacedAt < cutoffSeconds) {
			deletions.push(name);
			continue;
		}

		ledgerLines.push(`${name}\t${String(replacedAt)}`);
	}

	return { deletions, ledger: ledgerLines.join('\n') };
}

async function pruneStaleAssets(config: DeployConfig, distPath: string) {
	const assetsPath = `${config.sitePath}/_x`;
	const currentNames = new Set(
		readdirSync(path.join(distPath, '_x'), { recursive: true, withFileTypes: true })
			.filter((entry) => entry.isFile())
			.map((entry) =>
				path.relative(path.join(distPath, '_x'), path.join(entry.parentPath, entry.name)),
			),
	);

	await withSpinner('Pruning stale assets', async () => {
		const [ledger, listing] = await Promise.all([
			sshCapture(config, `cat ${assetsPath}/${assetLedgerName} 2>/dev/null || true`),
			sshCapture(
				config,
				String.raw`cd ${assetsPath} && find . -mindepth 1 -name '.*' -prune -o -type f -printf '%P\n'`,
			),
		]);
		const plan = planAssetRetention({
			currentNames,
			ledger,
			now: new Date(),
			remoteNames: listing.split('\n').filter(Boolean),
		});

		await sshExecWithInput(config, `cat > ${assetsPath}/${assetLedgerName}`, plan.ledger);

		if (plan.deletions.length === 0) return;

		await sshExecWithInput(
			config,
			String.raw`cd ${assetsPath} && xargs -r -d '\n' rm -f --`,
			plan.deletions.join('\n'),
		);
	});
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
				String.raw`find . -mindepth 2 -maxdepth 2 -name .superseded -mtime +${String(retentionDays)} -exec sh -c 'rm -rf "$(dirname "$1")"' _ {} \;`,
			].join('; '),
		),
	);
}

export async function deployApp(options: DeployAppOptions): Promise<void> {
	const { dryRun = false, skipDelete = false } = options;

	const config = loadDeployConfig();

	const { clientDir: distPath } = await getAstroPaths();

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
