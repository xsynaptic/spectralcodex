#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';

interface DeployCaddyOptions {
	rootPath: string;
	dryRun?: boolean;
}

export async function deployCaddy(options: DeployCaddyOptions): Promise<void> {
	const { rootPath, dryRun = false } = options;

	const config = loadDeployConfig(rootPath);

	const siteDir = path.join(rootPath, 'deploy/site');
	const remoteCaddySitesPath = `${config.remotePath}/caddy/sites`;
	const remoteCertsPath = `${config.remotePath}/certs`;

	console.log(chalk.blue('Deploying Caddy config...'));
	console.log(chalk.gray(`  Caddy sites: ${siteDir}/caddy/sites/ -> ${config.remoteHost}:${remoteCaddySitesPath}/`));
	console.log(chalk.gray(`  Certs:       ${siteDir}/certs/ -> ${config.remoteHost}:${remoteCertsPath}/`));

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const sshFlag = config.sshKeyPath ? ['-e', `ssh -i ${config.sshKeyPath}`] : [];
	const dryRunFlag = dryRun ? ['--dry-run'] : [];

	const start = Date.now();

	// Sync Caddy site configs
	await $({ stdio: 'inherit' })`rsync ${[
		'-avz',
		'--progress',
		...sshFlag,
		...dryRunFlag,
		`${siteDir}/caddy/sites/`,
		`${config.remoteHost}:${remoteCaddySitesPath}/`,
	]}`;

	// Sync TLS certs
	await $({ stdio: 'inherit' })`rsync ${[
		'-avz',
		'--progress',
		...sshFlag,
		...dryRunFlag,
		`${siteDir}/certs/`,
		`${config.remoteHost}:${remoteCertsPath}/`,
	]}`;

	// Reload Caddy
	if (!dryRun) {
		const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

		try {
			await $({ stdio: 'inherit' })`ssh ${sshArgs} ${'docker exec caddy caddy reload --config /etc/caddy/Caddyfile'}`;
		} catch {
			console.log(chalk.yellow('Warning: Caddy reload failed (container may not be running)'));
		}
	}

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-caddy')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dry-run': { type: 'boolean', default: false },
		},
	});

	await ensureSshKeychain();

	await deployCaddy({
		rootPath: values['root-path'],
		dryRun: values['dry-run'],
	});
}
