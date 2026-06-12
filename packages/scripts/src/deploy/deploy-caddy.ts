import chalk from 'chalk';
import path from 'node:path';

import { loadDeployConfig } from './deploy-config.js';
import { rsyncTo, sshExec } from './rsync-exec.js';

interface DeployCaddyOptions {
	rootPath: string;
	dryRun?: boolean;
}

export async function deployCaddy(options: DeployCaddyOptions): Promise<void> {
	const { rootPath, dryRun = false } = options;

	const config = loadDeployConfig();

	const siteDir = path.join(rootPath, 'deploy/site');
	const remoteCaddySitesPath = `${config.remotePath}/caddy/sites`;
	const remoteCertsPath = `${config.remotePath}/certs`;

	console.log(chalk.blue('Deploying Caddy config...'));
	console.log(
		chalk.gray(
			`  Caddy sites: ${siteDir}/caddy/sites/ -> ${config.remoteHost}:${remoteCaddySitesPath}/`,
		),
	);
	console.log(
		chalk.gray(`  Certs:       ${siteDir}/certs/ -> ${config.remoteHost}:${remoteCertsPath}/`),
	);

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	await rsyncTo(`${siteDir}/caddy/sites/`, `${config.remoteHost}:${remoteCaddySitesPath}/`, {
		config,
		dryRun,
	});

	await rsyncTo(`${siteDir}/certs/`, `${config.remoteHost}:${remoteCertsPath}/`, {
		config,
		dryRun,
	});

	try {
		await sshExec(config, 'docker exec caddy caddy reload --config /etc/caddy/Caddyfile', {
			dryRun,
		});
	} catch {
		console.log(chalk.yellow('Warning: Caddy reload failed (container may not be running)'));
	}

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}
