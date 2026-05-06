#!/usr/bin/env tsx
import chalk from 'chalk';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';

const PROJECT_SLUG = 'spectralcodex';
const IMAGE_NAME = `${PROJECT_SLUG}-image-server`;
const BUNDLE_DIR = `/tmp/${IMAGE_NAME}-bundle`;
const TARBALL_LOCAL = `/tmp/${IMAGE_NAME}.tar.gz`;
const TARBALL_REMOTE = `/tmp/${IMAGE_NAME}.tar.gz`;

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

	const pkgPath = path.join(rootPath, 'services/image-server/package.json');
	const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as { version: string };

	if (!pkg.version) throw new Error(`Missing "version" in ${pkgPath}`);

	const version = pkg.version;

	const composeFile = path.join(rootPath, 'deploy/site/docker-compose.yml');
	const dockerfile = path.join(rootPath, 'services/image-server/Dockerfile');
	const projectPath = `${config.remotePath}/${PROJECT_SLUG}`;

	const tagLatest = `${IMAGE_NAME}:latest`;
	const tagVersion = `${IMAGE_NAME}:${version}`;

	console.log(chalk.blue('Deploying image server...'));
	console.log(chalk.gray(`  Tags: ${tagLatest}, ${tagVersion}`));
	console.log(chalk.gray(`  To: ${config.remoteHost}:${projectPath}/`));
	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];
	const sshFlag = config.sshKeyPath ? ['-e', `ssh -i ${config.sshKeyPath}`] : [];
	const composeCmd = `docker compose -p ${PROJECT_SLUG} -f ${projectPath}/deploy/site/docker-compose.yml`;

	const start = Date.now();

	// Build TypeScript on host (uses workspace install)
	console.log(chalk.gray('Building image-server (tsdown)...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm --filter @xsynaptic/image-server build`;

	// Extract self-contained production bundle
	console.log(chalk.gray(`Producing deploy bundle at ${BUNDLE_DIR}...`));
	await $({ stdio: 'inherit' })`rm -rf ${BUNDLE_DIR}`;
	await $({
		stdio: 'inherit',
		cwd: rootPath,
	})`pnpm --filter @xsynaptic/image-server deploy --prod ${BUNDLE_DIR}`;

	// Build linux/amd64 image with the bundle as context
	console.log(chalk.gray('Building Docker image (linux/amd64)...'));
	if (dryRun) {
		console.log(chalk.yellow('  (skipped: dry run)'));
	} else {
		await $({ stdio: 'inherit' })`docker buildx build ${[
			'--platform',
			'linux/amd64',
			'--load',
			'-t',
			tagLatest,
			'-t',
			tagVersion,
			'-f',
			dockerfile,
			BUNDLE_DIR,
		]}`;
	}

	// Save + gzip locally (overwrites any existing tarball at the path)
	if (dryRun) {
		console.log(chalk.gray(`Saving image to ${TARBALL_LOCAL}... (skipped: dry run)`));
	} else {
		console.log(chalk.gray(`Saving image to ${TARBALL_LOCAL}...`));
		await $({
			stdio: 'inherit',
			shell: true,
		})`docker save ${tagLatest} ${tagVersion} | gzip > ${TARBALL_LOCAL}`;
	}

	// Sync compose file
	await $({ stdio: 'inherit' })`rsync ${[
		'-avz',
		'--mkpath',
		'--progress',
		...sshFlag,
		...(dryRun ? ['--dry-run'] : []),
		composeFile,
		`${config.remoteHost}:${projectPath}/deploy/site/docker-compose.yml`,
	]}`;

	if (dryRun) {
		console.log(chalk.yellow('Skipping tarball rsync and remote SSH commands (dry run)'));
		console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
		return;
	}

	// Sync tarball
	console.log(chalk.gray('Shipping image tarball...'));
	await $({ stdio: 'inherit' })`rsync ${[
		'-avz',
		'--progress',
		...sshFlag,
		TARBALL_LOCAL,
		`${config.remoteHost}:${TARBALL_REMOTE}`,
	]}`;

	// Write server .env (compose reads from its own directory)
	console.log(chalk.gray('Writing server environment...'));
	const envContent = `DEPLOY_MEDIA_PATH=${config.mediaPath}\nIPX_SERVER_SECRET=${ipxServerSecret}`;
	await $({
		stdio: 'inherit',
	})`ssh ${sshArgs} ${`mkdir -p ${projectPath}/deploy/site && cat > ${projectPath}/deploy/site/.env << 'ENVEOF'\n${envContent}\nENVEOF`}`;

	// Load image into VPS docker
	console.log(chalk.gray('Loading image on remote...'));
	await $({
		stdio: 'inherit',
	})`ssh ${sshArgs} ${`gunzip -c ${TARBALL_REMOTE} | docker load`}`;

	// Recreate containers with the new image
	console.log(chalk.gray('Recreating containers...'));
	await $({
		stdio: 'inherit',
	})`ssh ${sshArgs} ${`${composeCmd} up -d --force-recreate --remove-orphans`}`;

	// Health check
	console.log(chalk.gray('Waiting for health checks...'));
	try {
		await $({
			stdio: 'inherit',
		})`ssh ${sshArgs} ${`${composeCmd} up -d --wait --wait-timeout 30`}`;
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
