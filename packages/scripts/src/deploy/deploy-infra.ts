import { formatDuration, log } from '@xsynaptic/astro-scripts';
import path from 'node:path';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { logCaddyChanges, readComposeCaddyImage, syncCaddyConfig } from '#deploy/deploy-caddy.ts';
import { loadDeployConfig, requireEnv } from '#deploy/deploy-config.ts';
import {
	describeRsyncSummary,
	rsyncTo,
	sshCapture,
	sshExec,
	sshExecWithInput,
} from '#deploy/rsync-exec.ts';

interface DeployInfraOptions {
	dryRun?: boolean;
	rootPath: string;
}

interface InfraSyncTarget {
	destination?: string;
	excludes?: Array<string>;
	extraFlags?: Array<string>;
	source: string;
}

function buildServerEnv(config: DeployConfig): string {
	const lines = [
		`UMAMI_DATA_PATH=${requireEnv('UMAMI_DATA_PATH')}`,
		`UMAMI_BACKUP_PATH=${requireEnv('UMAMI_BACKUP_PATH')}`,
		`UMAMI_DB_PASSWORD=${requireEnv('UMAMI_DB_PASSWORD')}`,
		`UMAMI_APP_SECRET=${requireEnv('UMAMI_APP_SECRET')}`,
		`DEPLOY_MEDIA_PATH=${config.mediaPath}`,
		`SITE_URL=${config.siteUrl}`,
		`CLOUDFLARE_ZONE_ID=${requireEnv('CLOUDFLARE_ZONE_ID')}`,
		`CLOUDFLARE_API_TOKEN=${requireEnv('CLOUDFLARE_API_TOKEN')}`,
		`CACHE_WARM_CONCURRENCY=${process.env.CACHE_WARM_CONCURRENCY ?? '8'}`,
		`JMAP_SESSION_URL=${requireEnv('JMAP_SESSION_URL')}`,
		`JMAP_API_TOKEN=${requireEnv('JMAP_API_TOKEN')}`,
		`ALERT_EMAIL_TO=${requireEnv('ALERT_EMAIL_TO')}`,
	];

	if (process.env.ALERT_EMAIL_FROM) {
		lines.push(`ALERT_EMAIL_FROM=${process.env.ALERT_EMAIL_FROM}`);
	}
	if (process.env.ALERT_ALWAYS) lines.push(`ALERT_ALWAYS=${process.env.ALERT_ALWAYS}`);
	if (process.env.ALERT_MIN_FAILURES) {
		lines.push(`ALERT_MIN_FAILURES=${process.env.ALERT_MIN_FAILURES}`);
	}

	return lines.join('\n');
}

const infraSyncTargets: Array<InfraSyncTarget> = [
	{ extraFlags: ['--mkpath'], source: 'docker-compose.yml' },
	{
		destination: 'umami-db-backup/',
		extraFlags: ['--mkpath', '--delete'],
		source: 'umami-db-backup/',
	},
	{
		destination: 'cache-warmer/',
		excludes: ['node_modules'],
		extraFlags: ['--mkpath', '--delete', '--delete-excluded'],
		source: 'cache-warmer/',
	},
];

export async function deployInfra(options: DeployInfraOptions): Promise<void> {
	const { dryRun = false, rootPath } = options;

	const config = loadDeployConfig();
	const serverEnv = buildServerEnv(config);

	const deployDir = path.join(rootPath, 'deploy');
	const remotePath = config.remotePath;

	log.step('Deploying infrastructure...');
	log.detail(`To: ${config.remoteHost}:${remotePath}/`);
	if (dryRun) log.warn('Dry run');

	const start = Date.now();

	const image = await readComposeCaddyImage(deployDir);
	const caddyChanges = await syncCaddyConfig({ config, deployDir, dryRun, image });

	log.detail(`Caddy config validated with ${image}`);
	logCaddyChanges(caddyChanges);

	await syncInfraFiles({ config, deployDir, dryRun });

	if (dryRun) {
		log.warn(`Dry run; skipping remote commands and the ${remotePath}/.env write`);
		log.success(`Infrastructure synced in ${formatDuration(Date.now() - start)}`);
		return;
	}

	await updateRemoteServices(config, serverEnv);

	log.success(`Infrastructure deployed in ${formatDuration(Date.now() - start)}`);
}

async function syncInfraFiles({
	config,
	deployDir,
	dryRun,
}: {
	config: DeployConfig;
	deployDir: string;
	dryRun: boolean;
}): Promise<void> {
	for (const { destination = '', source, ...rsyncFlags } of infraSyncTargets) {
		const summary = await rsyncTo(
			`${deployDir}/${source}`,
			`${config.remoteHost}:${config.remotePath}/${destination}`,
			{ config, dryRun, label: `Syncing ${source}`, ...rsyncFlags },
		);

		log.detail(`${source} · ${describeRsyncSummary(summary)}`);
	}
}

async function updateRemoteServices(config: DeployConfig, serverEnv: string): Promise<void> {
	const remotePath = config.remotePath;

	log.detail('Writing server environment...');
	await sshExecWithInput(
		config,
		`umask 077 && cat > ${remotePath}/.env && chmod 600 ${remotePath}/.env`,
		`${serverEnv}\n`,
	);

	const composeCmd = `cd ${remotePath} && docker compose`;

	log.detail('Pulling images...');
	await sshExec(config, `${composeCmd} pull`);

	// cache-warmer is under the `jobs` profile; --profile ensures it builds alongside the rest
	log.detail('Building local images...');
	await sshExec(config, `${composeCmd} --profile jobs build`);

	log.detail('Recreating containers...');
	await sshExec(config, `${composeCmd} up -d --remove-orphans --wait --wait-timeout 120`);

	log.detail('Verifying service state...');
	const psOutput = await sshCapture(config, `${composeCmd} ps`);
	log.info(psOutput);

	if (/\(unhealthy\)|Exit|Restarting/.test(psOutput)) {
		throw new Error('One or more services unhealthy or restarting');
	}

	// Caddy serves its config from a bind mount, so a Caddyfile-only change needs a reload
	log.detail('Reloading Caddy...');
	await sshExec(config, 'docker exec caddy caddy reload --config /etc/caddy/Caddyfile');
}
