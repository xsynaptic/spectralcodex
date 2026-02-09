#!/usr/bin/env tsx
import { OPEN_GRAPH_BASE_PATH } from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { cacheWarmNew } from '../image-server/cache-warm.js';
import { generateManifest } from '../image-server/manifest.js';
import { ensureSshKeychain } from '../shared/utils.js';
import { deployApp } from './deploy-app.js';
import { loadDeployConfig, printDeployConfig } from './deploy-config.js';
import { deployMedia } from './deploy-media.js';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
		'cache-path': { type: 'string', default: './.cache' },
		'og-image-path': { type: 'string', default: './.cache/og-image' },
		'dry-run': { type: 'boolean', default: false },
		'skip-build': { type: 'boolean', default: false },
	},
});

const rootPath = values['root-path'];
const cachePath = path.join(rootPath, values['cache-path']);
const ogImagePath = path.join(rootPath, values['og-image-path']);
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

async function mergeOpengraph() {
	const ogDistPath = path.join(distPath, OPEN_GRAPH_BASE_PATH);

	console.log(chalk.blue('Merging OpenGraph images into dist...'));
	console.log(chalk.gray(`  From: ${ogImagePath}`));
	console.log(chalk.gray(`  To:   ${ogDistPath}`));

	// Merge without deleting existing files (preserves public/og defaults and renamed entries)
	// rsync -av: archive mode, verbose, only transfers changed files based on mtime/size
	await $({ stdio: 'inherit' })`rsync -av ${ogImagePath}/ ${ogDistPath}/`;
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
	await deployApp({ rootPath, dryRun, skipDelete: skipBuild });
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
	await mergeOpengraph();
	manifest();
	await media();
	await transfer();
	await warmNew();
	console.log(chalk.green('Deploy complete'));
} catch (error) {
	console.error(chalk.red('Deploy failed:'), error);
	process.exit(1);
}
