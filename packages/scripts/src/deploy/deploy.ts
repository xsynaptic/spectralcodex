#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { cacheWarmNew } from '../image-server/cache-warm.js';
import { generateManifest } from '../image-server/manifest.js';
import { ensureSshKeychain } from '../shared/utils.js';
import { deployApp } from './deploy-app.js';
import { purgeCache } from './deploy-cache-purge.js';
import { loadDeployConfig, printDeployConfig } from './deploy-config.js';
import { deployMedia } from './deploy-media.js';
import { deployOg } from './deploy-og.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
		'cache-path': { type: 'string', default: './.cache' },
		'dry-run': { type: 'boolean', default: false },
		'skip-build': { type: 'boolean', default: false },
	},
});

const rootPath = values['root-path'];
const cachePath = path.join(rootPath, values['cache-path']);
const dryRun = values['dry-run'];
const skipBuild = values['skip-build'];

// Load and validate deploy configuration
const config = loadDeployConfig(rootPath);

printDeployConfig(config);

const distPath = path.join(rootPath, 'dist');

await ensureSshKeychain();

// Note: because our content validation scripts rely on data-store.json we need to sync first
async function sync() {
	console.log(chalk.blue('Syncing content...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm astro sync`;
}

async function validate() {
	console.log(chalk.blue('Validating content...'));
	await $({ stdio: 'inherit' })`pnpm content-validate --root-path=${rootPath}`;
}

async function related() {
	console.log(chalk.blue('Generating related content...'));
	await $({
		stdio: 'inherit',
	})`pnpm content-related --root-path=${rootPath}`;
}

async function opengraph() {
	console.log(chalk.blue('Generating OpenGraph images...'));
	await $({
		stdio: 'inherit',
	})`pnpm og-image --root-path=${rootPath}`;
}

async function og() {
	await deployOg({ rootPath, dryRun });
}

async function build() {
	if (skipBuild) {
		console.log(chalk.yellow('Skipping build'));
		return;
	}
	console.log(chalk.blue('Building...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm astro build`;
}

async function test() {
	console.log(chalk.blue('Running E2E smoke tests...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm test:e2e`;
}

function manifest() {
	const urlPattern = process.env.IPX_SERVER_URL;
	if (!urlPattern) {
		throw new Error('Missing IPX_SERVER_URL environment variable');
	}

	console.log(chalk.blue('Generating cache manifest...'));
	generateManifest({
		distPath,
		outputPath: path.join(distPath, 'cache-manifest.json'),
		urlPattern,
		mainPath: path.join(cachePath, 'cache-manifest-main.json'),
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
	await deployApp({ rootPath, dryRun });
}

async function warmNew() {
	console.log(chalk.blue('Warming new image cache...'));
	await cacheWarmNew({ rootPath, dryRun });
}

try {
	await sync();
	await validate();
	await related();
	await opengraph();
	await build();
	await test();
	manifest();
	await media();
	await transfer();
	await og();
	await purgeCache({ rootPath, dryRun });
	await warmNew();
	console.log(chalk.green('Deploy complete'));
} catch (error) {
	console.error(chalk.red('Deploy failed:'), error);
	process.exit(1);
}
