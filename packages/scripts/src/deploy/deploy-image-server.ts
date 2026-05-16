#!/usr/bin/env tsx
import chalk from 'chalk';
import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';

const PROJECT_SLUG = 'spectralcodex';
const IMAGE_NAME = `${PROJECT_SLUG}-image-server`;
const BUNDLE_DIR = `/tmp/${IMAGE_NAME}-bundle`;

export async function deployImageServer({
	rootPath,
	dryRun = false,
}: {
	rootPath: string;
	dryRun?: boolean;
}): Promise<void> {
	const config = loadDeployConfig();

	const ipxServerSecret = process.env.IPX_SERVER_SECRET;
	if (!ipxServerSecret) {
		throw new Error('Missing IPX_SERVER_SECRET environment variable');
	}

	const serviceDir = path.join(rootPath, 'services/image-server');
	const composeFile = path.join(rootPath, 'deploy/site/docker-compose.yml');
	const dockerfile = path.join(serviceDir, 'Dockerfile');
	const nginxTemplate = path.join(serviceDir, 'nginx.conf.template');
	const projectPath = `${config.remotePath}/${PROJECT_SLUG}`;
	const remoteServiceDir = `${projectPath}/services/image-server`;
	const remoteComposeFile = `${projectPath}/deploy/site/docker-compose.yml`;

	console.log(chalk.blue('Deploying image server...'));
	console.log(chalk.gray(`  To: ${config.remoteHost}:${projectPath}/`));
	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];
	const sshFlag = config.sshKeyPath ? ['-e', `ssh -i ${config.sshKeyPath}`] : [];
	const composeCmd = `docker compose -p ${PROJECT_SLUG} -f ${remoteComposeFile}`;

	const start = Date.now();

	// Use pnpm deploy to produce an isolated package and dedicated lockfile
	// We discard its node_modules and dist folder; the multi-stage Dockerfile rebuilds them later
	console.log(chalk.gray(`Producing deploy bundle at ${BUNDLE_DIR}...`));
	await $({ stdio: 'inherit' })`rm -rf ${BUNDLE_DIR}`;
	await $({
		stdio: 'inherit',
		cwd: rootPath,
	})`pnpm --filter @xsynaptic/image-server deploy --prod ${BUNDLE_DIR}`;

	// Strip host-built artifacts so the container builds fresh from src + lockfile
	await $({
		stdio: 'inherit',
	})`rm -rf ${path.join(BUNDLE_DIR, 'node_modules')} ${path.join(BUNDLE_DIR, 'dist')}`;

	// Co-locate Dockerfile and nginx.conf.template inside the bundle for easier rsync
	console.log(chalk.gray('Adding Dockerfile + nginx.conf.template to bundle...'));
	await copyFile(dockerfile, path.join(BUNDLE_DIR, 'Dockerfile'));
	await copyFile(nginxTemplate, path.join(BUNDLE_DIR, 'nginx.conf.template'));

	// Sync compose file
	await $({ stdio: 'inherit' })`rsync ${[
		'-avz',
		'--mkpath',
		'--progress',
		...sshFlag,
		...(dryRun ? ['--dry-run'] : []),
		composeFile,
		`${config.remoteHost}:${remoteComposeFile}`,
	]}`;

	// Sync bundle to remote service dir; --delete-after cleans stale files
	console.log(chalk.gray('Syncing bundle to remote...'));
	await $({ stdio: 'inherit' })`rsync ${[
		'-avz',
		'--mkpath',
		'--progress',
		'--delete-after',
		...sshFlag,
		...(dryRun ? ['--dry-run'] : []),
		`${BUNDLE_DIR}/`,
		`${config.remoteHost}:${remoteServiceDir}/`,
	]}`;

	if (dryRun) {
		console.log(chalk.yellow('Skipping remote SSH commands (dry run)'));
		console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
		return;
	}

	// Write server .env (compose reads from its own directory)
	console.log(chalk.gray('Writing server environment...'));
	const envContent = `DEPLOY_MEDIA_PATH=${config.mediaPath}\nIPX_SERVER_SECRET=${ipxServerSecret}`;
	await $({
		stdio: 'inherit',
	})`ssh ${sshArgs} ${`mkdir -p ${projectPath}/deploy/site && cat > ${projectPath}/deploy/site/.env << 'ENVEOF'\n${envContent}\nENVEOF`}`;

	// Build image on remote (native amd64, hits local layer cache)
	console.log(chalk.gray('Building image on remote...'));
	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${`${composeCmd} build image-server`}`;

	// Recreate containers and wait for health
	console.log(chalk.gray('Recreating containers...'));
	try {
		await $({
			stdio: 'inherit',
		})`ssh ${sshArgs} ${`${composeCmd} up -d --force-recreate --remove-orphans --wait --wait-timeout 60`}`;
	} catch {
		console.log(chalk.yellow('Warning: Health check timed out'));
	}

	// Show status
	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${`${composeCmd} ps`}`;

	// Prune dangling images left behind by retagging :latest
	console.log(chalk.gray('Pruning dangling images on remote...'));
	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${`docker image prune -f`}`;

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
