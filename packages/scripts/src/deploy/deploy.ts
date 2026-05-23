#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { warmImageCacheNew } from '../image-server/cache-warm.js';
import { generateManifest } from '../image-server/manifest.js';
import { ensureSshKeychain, findWorkspaceRoot } from '../shared/utils.js';
import { deployApp } from './deploy-app.js';
import { purgeCache } from './deploy-cache-purge.js';
import { warmCache } from './deploy-cache-warm.js';
import { deployCaddy } from './deploy-caddy.js';
import { loadDeployConfig, printDeployConfig } from './deploy-config.js';
import { deployMedia } from './deploy-media.js';
import { deployOg } from './deploy-og.js';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'cache-path': { type: 'string', default: './.cache' },
		'dry-run': { type: 'boolean', default: false },
		'skip-build': { type: 'boolean', default: false },
	},
});

const cachePath = path.join(rootPath, values['cache-path']);
const dryRun = values['dry-run'];
const skipBuild = values['skip-build'];

// Load and validate deploy configuration
const config = loadDeployConfig();

printDeployConfig(config);

const distPath = path.join(rootPath, 'dist');

await ensureSshKeychain();

// Note: because our content validation scripts rely on data-store.json we need to sync first
async function sync() {
	console.log(chalk.blue('Syncing content...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm astro sync --mode production`;
}

async function validate() {
	console.log(chalk.blue('Validating content...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm -F @spectralcodex/scripts validate-content`;
}

async function generateRedirects() {
	console.log(chalk.blue('Generating redirects...'));
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm generate-redirects`;
}

async function similar() {
	console.log(chalk.blue('Generating similar content...'));
	await $({
		stdio: 'inherit',
		cwd: rootPath,
	})`pnpm similar-content`;
}

async function generateOpenGraph() {
	console.log(chalk.blue('Generating OpenGraph images...'));
	await $({
		stdio: 'inherit',
		cwd: rootPath,
	})`pnpm og-image --dist-path=${distPath}`;
}

async function transferOpenGraph() {
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
	await $({ stdio: 'inherit', cwd: rootPath })`pnpm test-e2e`;
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

async function caddy() {
	await deployCaddy({ rootPath, dryRun });
}

async function healthCheck() {
	const siteUrl = process.env.PROD_SERVER_URL;
	if (!siteUrl) return;

	console.log(chalk.blue(`Health check: ${siteUrl}`));
	const response = await fetch(siteUrl);
	if (!response.ok) {
		throw new Error(`Health check failed: ${String(response.status)} ${response.statusText}`);
	}
	console.log(chalk.green(`Health check passed (${String(response.status)})`));
}

try {
	// Prepare content
	await sync();
	await validate();
	await generateRedirects();
	await similar();

	// Build & verify
	await build();
	await generateOpenGraph();
	await test();
	manifest();

	// Transfer to server
	await media();
	await transfer();
	await transferOpenGraph();
	await caddy();

	// Verify & refresh caches
	await healthCheck();
	await warmImageCacheNew({ rootPath, dryRun });
	await purgeCache({ rootPath, dryRun });
	await warmCache({ dryRun });

	console.log(chalk.green('Deploy complete'));
} catch (error) {
	console.error(chalk.red('Deploy failed:'), error);
	process.exit(1);
}
