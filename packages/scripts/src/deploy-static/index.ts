#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { deployMedia } from '../deploy-media/index.js';
import { generateManifest } from '../image-server/manifest.js';
import { warmCache } from '../image-server/warm.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
		'content-path': { type: 'string', default: 'packages/content' },
		'cache-path': { type: 'string', default: './node_modules/.astro' },
		'dry-run': { type: 'boolean', default: false },
		'skip-build': { type: 'boolean', default: false },
		'cache-warm': { type: 'boolean', default: false },
	},
});

const rootPath = values['root-path'];
const contentPath = values['content-path'];
const cachePath = values['cache-path'];
const dryRun = values['dry-run'];
const skipBuild = values['skip-build'];
const cacheWarm = values['cache-warm'];

dotenv.config({ path: path.join(rootPath, '.env') });
dotenv.config({ path: path.join(rootPath, 'deploy/.env') });

const distPath = path.join(rootPath, 'dist');

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

try {
	await $`ssh-add --apple-load-keychain 2>/dev/null`;
} catch {
	// Ignore
}

async function validate() {
	console.log(chalk.blue('Validating content...'));
	await $({ stdio: 'inherit' })`pnpm content-validate --root-path=${rootPath}`;
}

async function related() {
	console.log(chalk.blue('Generating related content...'));
	await $({ stdio: 'inherit' })`pnpm content-related --root-path=${rootPath} --content-path=${contentPath} --cache-path=${cachePath}`;
}

async function opengraph() {
	console.log(chalk.blue('Generating OpenGraph images...'));
	await $({ stdio: 'inherit' })`pnpm opengraph-image --root-path=${rootPath} --content-path=${contentPath} --output-path=${rootPath}/public/0g`;
}

async function build() {
	if (skipBuild) {
		console.log(chalk.yellow('Skipping build'));
		return;
	}
	console.log(chalk.blue('Building...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm astro build`;
}

function manifest() {
	console.log(chalk.blue('Generating cache manifest...'));
	generateManifest({
		distPath,
		outputPath: path.join(distPath, 'cache-manifest.json'),
	});
}

async function media() {
	try {
		await deployMedia({ rootPath, dryRun });
	} catch (error) {
		if (error instanceof Error && error.message.includes('not found')) {
			console.log(chalk.yellow('Media path not found, skipping'));
			return;
		}
		throw error;
	}
}

async function transfer() {
	console.log(chalk.blue('Transferring static files...'));
	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const rsyncArgs = [
		'-avz',
		'--progress',
		'-e', `ssh -i ${sshKeyPath}`,
		'--delete-after',
		...(dryRun ? ['--dry-run'] : []),
		`${distPath}/`,
		`${remoteHost}:${remotePath}/`,
	];

	await $({ stdio: 'inherit' })`rsync ${rsyncArgs}`;
}

async function warm() {
	if (!cacheWarm || dryRun) return;
	await warmCache({ rootPath });
}

try {
	await validate();
	await related();
	await opengraph();
	await build();
	manifest();
	await media();
	await transfer();
	await warm();
	console.log(chalk.green('Deploy complete'));
} catch (error) {
	console.error(chalk.red('Deploy failed:'), error);
	process.exit(1);
}
