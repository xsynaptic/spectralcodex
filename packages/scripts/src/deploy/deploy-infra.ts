import chalk from 'chalk';
import path from 'node:path';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { rsyncTo, sshCapture, sshExec, sshExecWithInput } from '#deploy/rsync-exec.ts';

interface DeployInfraOptions {
	rootPath: string;
	dryRun?: boolean;
}

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

// Builds the single server-side .env consumed by deploy/docker-compose.yml (umami, image, cache-warmer)
function buildServerEnv(config: DeployConfig): string {
	const signatureLength = process.env.IMAGE_SERVER_SIGNATURE_LENGTH ?? '20';

	const lines = [
		`UMAMI_DATA_PATH=${requireEnv('UMAMI_DATA_PATH')}`,
		`UMAMI_BACKUP_PATH=${requireEnv('UMAMI_BACKUP_PATH')}`,
		`UMAMI_DB_PASSWORD=${requireEnv('UMAMI_DB_PASSWORD')}`,
		`UMAMI_APP_SECRET=${requireEnv('UMAMI_APP_SECRET')}`,
		`DEPLOY_MEDIA_PATH=${config.mediaPath}`,
		`IMAGE_SERVER_SECRET=${requireEnv('IMAGE_SERVER_SECRET')}`,
		`IMAGE_SERVER_SIGNATURE_LENGTH=${signatureLength}`,
		`SITE_URL=${config.siteUrl}`,
		`IMAGE_SERVER_URL=${config.imageServerUrl}`,
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

interface InfraSyncTarget {
	source: string;
	destination?: string;
	extraFlags?: Array<string>;
	excludes?: Array<string>;
}

const infraSyncTargets: Array<InfraSyncTarget> = [
	{ source: 'docker-compose.yml', extraFlags: ['--mkpath'] },
	{ source: 'nginx.conf.template' },
	{ source: 'caddy/', destination: 'caddy/', extraFlags: ['--mkpath', '--delete'] },
	{ source: 'certs/', destination: 'certs/', extraFlags: ['--mkpath'] },
	{
		source: 'umami-db-backup/',
		destination: 'umami-db-backup/',
		extraFlags: ['--mkpath', '--delete'],
	},
	{
		source: 'cache-warmer/',
		destination: 'cache-warmer/',
		excludes: ['node_modules'],
		extraFlags: ['--mkpath', '--delete', '--delete-excluded'],
	},
];

async function syncInfraFiles({
	config,
	deployDir,
	dryRun,
}: {
	config: DeployConfig;
	deployDir: string;
	dryRun: boolean;
}): Promise<void> {
	for (const { source, destination = '', ...rsyncFlags } of infraSyncTargets) {
		await rsyncTo(
			`${deployDir}/${source}`,
			`${config.remoteHost}:${config.remotePath}/${destination}`,
			{ config, dryRun, ...rsyncFlags },
		);
	}
}

async function updateRemoteServices(config: DeployConfig, serverEnv: string): Promise<void> {
	const remotePath = config.remotePath;

	console.log(chalk.gray('Writing server environment...'));
	await sshExecWithInput(
		config,
		`umask 077 && cat > ${remotePath}/.env && chmod 600 ${remotePath}/.env`,
		`${serverEnv}\n`,
	);

	const composeCmd = `cd ${remotePath} && docker compose`;

	console.log(chalk.gray('Pulling images...'));
	await sshExec(config, `${composeCmd} pull`);

	// cache-warmer is under the `jobs` profile; --profile ensures it builds alongside the rest
	console.log(chalk.gray('Building local images...'));
	await sshExec(config, `${composeCmd} --profile jobs build`);

	console.log(chalk.gray('Recreating containers...'));
	await sshExec(config, `${composeCmd} up -d --remove-orphans --wait --wait-timeout 120`);

	// compose won't recreate image-cache when only its bind-mounted nginx template changes, so force it
	console.log(chalk.gray('Applying image-cache config...'));
	await sshExec(config, `${composeCmd} up -d --force-recreate --no-deps --wait image-cache`);

	console.log(chalk.gray('Verifying service state...'));
	const psOutput = await sshCapture(config, `${composeCmd} ps`);
	console.log(psOutput);

	if (/\(unhealthy\)|Exit|Restarting/.test(psOutput)) {
		throw new Error('One or more services unhealthy or restarting');
	}

	// Caddy serves its config from a bind mount, so a Caddyfile-only change needs a reload
	console.log(chalk.gray('Reloading Caddy...'));
	try {
		await sshExec(config, 'docker exec caddy caddy reload --config /etc/caddy/Caddyfile');
	} catch {
		console.log(chalk.yellow('Warning: Caddy reload failed (container may not be running)'));
	}
}

export async function deployInfra(options: DeployInfraOptions): Promise<void> {
	const { rootPath, dryRun = false } = options;

	const config = loadDeployConfig();
	const serverEnv = buildServerEnv(config);

	const deployDir = path.join(rootPath, 'deploy');
	const remotePath = config.remotePath;

	console.log(chalk.blue('Deploying infrastructure...'));
	console.log(chalk.gray(`  To: ${config.remoteHost}:${remotePath}/`));
	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	await syncInfraFiles({ config, deployDir, dryRun });

	if (dryRun) {
		console.log(chalk.yellow('Skipping remote SSH commands (dry run)'));
		console.log(chalk.yellow(`DRY RUN write ${remotePath}/.env`));
		console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
		return;
	}

	await updateRemoteServices(config, serverEnv);

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}
