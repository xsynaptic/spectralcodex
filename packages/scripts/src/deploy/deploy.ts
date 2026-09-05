#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { deployApp } from '#deploy/deploy-app.ts';
import { invokeCacheRefresh } from '#deploy/deploy-cache-refresh.ts';
import { deployCaddy } from '#deploy/deploy-caddy.ts';
import { loadDeployConfig, printDeployConfig } from '#deploy/deploy-config.ts';
import { deployMedia } from '#deploy/deploy-media.ts';
import { deployOg } from '#deploy/deploy-og.ts';
import { verifyEdge } from '#deploy/verify-edge.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';
import { generateSitemapLastmod } from '#sitemap-lastmod/index.ts';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { type: 'boolean', default: false },
		'skip-build': { type: 'boolean', default: false },
	},
});

const isDryRun = values['dry-run'];
const isSkipBuild = values['skip-build'];

// Load and validate deploy configuration
const config = loadDeployConfig();

printDeployConfig(config);

const distPath = path.join(rootPath, 'dist');

await ensureSshKeychain();

// Content scripts read the store `astro sync` writes, so it has to run first
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

// A webmention.io outage must not block a deploy; the build falls back to the committed data
async function webmentions() {
	if (process.env.WEBMENTIONS_SHOW !== 'true') {
		console.log(chalk.gray('Skipping webmentions; `WEBMENTIONS_SHOW` is off'));
		return;
	}

	console.log(chalk.blue('Fetching webmentions...'));
	try {
		await $({
			stdio: 'inherit',
			cwd: rootPath,
		})`pnpm webmentions`;
	} catch {
		console.log(chalk.yellow('Webmention fetch failed, continuing with existing data'));
	}
}

async function generateOpenGraph() {
	console.log(chalk.blue('Generating OpenGraph images...'));
	await $({
		stdio: 'inherit',
		cwd: rootPath,
	})`pnpm og-image --dist-path=${distPath}`;
}

async function transferOpenGraph() {
	await deployOg({ rootPath, dryRun: isDryRun });
}

async function build() {
	if (isSkipBuild) {
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

async function media() {
	try {
		await deployMedia({ rootPath, dryRun: isDryRun });
	} catch (error) {
		if (error instanceof Error && error.message.includes('not found')) {
			console.log(chalk.yellow('Media path not found, skipping'));
			return;
		}
		throw error;
	}
}

async function transfer() {
	await deployApp({ rootPath, dryRun: isDryRun });
}

async function caddy() {
	await deployCaddy({ rootPath, dryRun: isDryRun });
}

try {
	// Prepare content
	await sync();
	await validate();
	await generateRedirects();
	await similar();
	await webmentions();
	await generateSitemapLastmod({ rootPath, siteUrl: config.siteUrl });

	// Build & verify
	await build();
	await generateOpenGraph();
	await test();

	// Transfer to server
	await media();
	await transfer();
	await transferOpenGraph();
	await caddy();

	// Verify & refresh caches
	if (!isDryRun) await verifyEdge();
	await invokeCacheRefresh({ dryRun: isDryRun });

	console.log(chalk.green('Deploy complete'));
} catch (error) {
	console.error(chalk.red('Deploy failed:'), error);
	process.exit(1);
}
