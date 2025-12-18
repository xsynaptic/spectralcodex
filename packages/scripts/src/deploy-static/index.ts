#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
		'content-path': { type: 'string', default: 'packages/content' },
		'cache-path': { type: 'string', default: './node_modules/.astro' },
		'dry-run': { type: 'boolean', default: false },
		'skip-build': { type: 'boolean', default: false },
	},
});

const rootPath = values['root-path'];
const contentPath = values['content-path'];
const cachePath = values['cache-path'];
const dryRun = values['dry-run'];
const skipBuild = values['skip-build'];

dotenv.config({ path: path.join(rootPath, '.env') });
dotenv.config({ path: path.join(rootPath, 'deploy/.env') });

const envRemoteHost = process.env.DEPLOY_REMOTE_HOST;
const envSshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;
const envRemotePath = process.env.DEPLOY_REMOTE_PATH;

if (!envRemoteHost || !envSshKeyPath || !envRemotePath) {
	console.error(chalk.red('Missing DEPLOY_REMOTE_HOST, DEPLOY_SSH_KEY_PATH, or DEPLOY_REMOTE_PATH'));
	process.exit(1);
}

const remoteHost = envRemoteHost;
const sshKeyPath = envSshKeyPath;
const remotePath = envRemotePath;
const distPath = path.join(rootPath, 'dist');

try {
	await $`ssh-add --apple-load-keychain 2>/dev/null`;
} catch {
	console.warn(chalk.yellow('Could not load SSH keys from keychain'));
}

async function validate() {
	console.log(chalk.blue('Validating content...'));
	await $`pnpm content-validate --root-path=${rootPath}`;
}

async function related() {
	console.log(chalk.blue('Generating related content...'));
	await $`pnpm content-related --root-path=${rootPath} --content-path=${contentPath} --cache-path=${cachePath}`;
}

async function opengraph() {
	console.log(chalk.blue('Generating OpenGraph images...'));
	await $`pnpm opengraph-image --root-path=${rootPath} --content-path=${contentPath} --output-path=${rootPath}/public/og`;
}

async function build() {
	if (skipBuild) {
		console.log(chalk.yellow('Skipping build'));
		return;
	}
	console.log(chalk.blue('Building...'));
	$.cwd = rootPath;
	await $`pnpm astro build`;
}

async function transfer() {
	console.log(chalk.blue(`Transferring to ${remoteHost}:${remotePath}`));
	if (dryRun) console.log(chalk.yellow('DRY RUN'));

	const rsyncArgs = [
		'-avz',
		'--progress',
		'-e', `ssh -i ${sshKeyPath}`,
		'--delete-after',
		...(dryRun ? ['--dry-run'] : []),
		`${distPath}/`,
		`${remoteHost}:${remotePath}/`,
	];

	await $`rsync ${rsyncArgs}`;
}

try {
	await validate();
	await related();
	await opengraph();
	await build();
	await transfer();
	console.log(chalk.green('Deploy complete'));
} catch (error) {
	console.error(chalk.red('Deploy failed:'), error);
	process.exit(1);
}
