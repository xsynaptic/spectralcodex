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

	const deployDir = path.join(rootPath, 'deploy');
	const remoteCaddyPath = `${config.remotePath}/caddy`;
	const remoteCertsPath = `${config.remotePath}/certs`;

	console.log(chalk.blue('Deploying Caddy config...'));
	console.log(
		chalk.gray(`  Caddy: ${deployDir}/caddy/ -> ${config.remoteHost}:${remoteCaddyPath}/`),
	);
	console.log(
		chalk.gray(`  Certs: ${deployDir}/certs/ -> ${config.remoteHost}:${remoteCertsPath}/`),
	);

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	await rsyncTo(`${deployDir}/caddy/`, `${config.remoteHost}:${remoteCaddyPath}/`, {
		config,
		dryRun,
	});

	await rsyncTo(`${deployDir}/certs/`, `${config.remoteHost}:${remoteCertsPath}/`, {
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
