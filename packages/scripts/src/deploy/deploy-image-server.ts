#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';
import { rsyncTo, sshExec } from './rsync-exec.js';

const PROJECT_SLUG = 'spectralcodex';

export async function deployImageServer({
	rootPath,
	dryRun = false,
}: {
	rootPath: string;
	dryRun?: boolean;
}): Promise<void> {
	const config = loadDeployConfig();

	const imageServerSecret = process.env.IMAGE_SERVER_SECRET;
	if (!imageServerSecret) {
		throw new Error('Missing IMAGE_SERVER_SECRET environment variable');
	}
	const imageServerSignatureLength = process.env.IMAGE_SERVER_SIGNATURE_LENGTH ?? '20';

	const composeFile = path.join(rootPath, 'deploy/site/docker-compose.yml');
	const nginxTemplate = path.join(rootPath, 'deploy/site/nginx.conf.template');
	const projectPath = `${config.remotePath}/${PROJECT_SLUG}`;
	const remoteComposeFile = `${projectPath}/deploy/site/docker-compose.yml`;
	const remoteNginxTemplate = `${projectPath}/deploy/site/nginx.conf.template`;

	console.log(chalk.blue('Deploying image server...'));
	console.log(chalk.gray(`  To: ${config.remoteHost}:${projectPath}/`));
	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const composeCmd = `docker compose -p ${PROJECT_SLUG} -f ${remoteComposeFile}`;

	const start = Date.now();

	await rsyncTo(composeFile, `${config.remoteHost}:${remoteComposeFile}`, {
		config,
		dryRun,
		extraFlags: ['--mkpath'],
	});

	// nginx config is volume-mounted by the compose file
	await rsyncTo(nginxTemplate, `${config.remoteHost}:${remoteNginxTemplate}`, {
		config,
		dryRun,
		extraFlags: ['--mkpath'],
	});

	if (dryRun) {
		console.log(chalk.yellow('Skipping remote SSH commands (dry run)'));
		console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
		return;
	}

	console.log(chalk.gray('Writing server environment...'));
	const envContent = [
		`DEPLOY_MEDIA_PATH=${config.mediaPath}`,
		`IMAGE_SERVER_SECRET=${imageServerSecret}`,
		`IMAGE_SERVER_SIGNATURE_LENGTH=${imageServerSignatureLength}`,
	].join('\n');
	await sshExec(
		config,
		`mkdir -p ${projectPath}/deploy/site && cat > ${projectPath}/deploy/site/.env << 'ENVEOF'\n${envContent}\nENVEOF`,
	);

	console.log(chalk.gray('Pulling image on remote...'));
	await sshExec(config, `${composeCmd} pull`);

	console.log(chalk.gray('Recreating containers...'));
	try {
		await sshExec(
			config,
			`${composeCmd} up -d --force-recreate --remove-orphans --wait --wait-timeout 60`,
		);
	} catch {
		console.log(chalk.yellow('Warning: Health check timed out'));
	}

	await sshExec(config, `${composeCmd} ps`);

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-image-server')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'dry-run': { type: 'boolean', default: false },
		},
	});

	await ensureSshKeychain();

	await deployImageServer({
		rootPath: findWorkspaceRoot(),
		dryRun: values['dry-run'],
	});
}
