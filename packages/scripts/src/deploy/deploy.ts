#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { generateManifest } from '../image-server/manifest.js';
import { warmCacheNew } from '../image-server/warm.js';
import { deployApp } from './deploy-app.js';
import { loadDeployConfig, printDeployConfig } from './deploy-config.js';
import { deployMedia } from './deploy-media.js';

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

// Load and validate deploy configuration
const config = loadDeployConfig(rootPath);

printDeployConfig(config);

const distPath = path.join(rootPath, 'dist');

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
	await $({
		stdio: 'inherit',
	})`pnpm content-related --root-path=${rootPath} --content-path=${contentPath} --cache-path=${cachePath}`;
}

async function opengraph() {
	console.log(chalk.blue('Generating OpenGraph images...'));
	await $({
		stdio: 'inherit',
	})`pnpm opengraph-image --root-path=${rootPath} --content-path=${contentPath} --output-path=${rootPath}/public/0g`;
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
	await warmCacheNew({ rootPath, dryRun });
}

try {
	await validate();
	await related();
	await opengraph();
	await build();
	manifest();
	await media();
	await transfer();
	await warmNew();
	console.log(chalk.green('Deploy complete'));
} catch (error) {
	console.error(chalk.red('Deploy failed:'), error);
	process.exit(1);
}
