#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';

interface DeployImageServerOptions {
	rootPath: string;
	dryRun?: boolean;
}

export async function deployImageServer(options: DeployImageServerOptions): Promise<void> {
	const { rootPath, dryRun = false } = options;

	const config = loadDeployConfig(rootPath);

	// Load IPX_SERVER_SECRET (only needed by this command)
	dotenv.config({ path: path.join(rootPath, '.env'), quiet: true });
	dotenv.config({ path: path.join(rootPath, 'deploy/.env'), quiet: true });

	const ipxServerSecret = process.env.IPX_SERVER_SECRET;

	if (!ipxServerSecret) {
		throw new Error('Missing IPX_SERVER_SECRET environment variable');
	}

	const siteDir = path.join(rootPath, 'deploy/site');
	const projectPath = `${config.remotePath}/spectralcodex`;

	console.log(chalk.blue('Deploying image server...'));
	console.log(chalk.gray(`  From: ${siteDir}/`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${projectPath}/`));

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const sshFlag = config.sshKeyPath ? ['-e', `ssh -i ${config.sshKeyPath}`] : [];
	const dryRunFlag = dryRun ? ['--dry-run'] : [];
	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	const start = Date.now();

	// Sync image server code
	await $({ stdio: 'inherit' })`rsync ${[
		'-avz',
		'--delete',
		'--progress',
		...sshFlag,
		'--exclude', 'node_modules',
		'--exclude', 'dist',
		'--exclude', 'caddy',
		'--exclude', 'certs',
		'--exclude', 'scripts',
		...dryRunFlag,
		`${siteDir}/`,
		`${config.remoteHost}:${projectPath}/`,
	]}`;

	if (dryRun) {
		console.log(chalk.yellow('Skipping SSH commands (dry run)'));
		console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
		return;
	}

	// Write server .env
	console.log(chalk.gray('Writing server environment...'));
	const envContent = `DEPLOY_MEDIA_PATH=${config.mediaPath}\nIPX_SERVER_SECRET=${ipxServerSecret}`;

	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${`cat > ${projectPath}/.env << 'ENVEOF'\n${envContent}\nENVEOF`}`;

	// Rebuild containers
	console.log(chalk.gray('Rebuilding containers...'));
	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${`cd ${projectPath} && docker compose pull && docker compose up -d --build --force-recreate`}`;

	// Health check
	console.log(chalk.gray('Waiting for health checks...'));

	try {
		await $({ stdio: 'inherit' })`ssh ${sshArgs} ${`cd ${projectPath} && docker compose up -d --wait --wait-timeout 30`}`;
	} catch {
		console.log(chalk.yellow('Warning: Health check timed out'));
	}

	// Show status
	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${`docker compose -f ${projectPath}/docker-compose.yml ps`}`;

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-image-server')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dry-run': { type: 'boolean', default: false },
		},
	});

	await ensureSshKeychain();

	await deployImageServer({
		rootPath: values['root-path'],
		dryRun: values['dry-run'],
	});
}
