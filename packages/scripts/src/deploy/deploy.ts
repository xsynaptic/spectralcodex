#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { deployApp } from '#deploy/deploy-app.ts';
import { invokeCacheRefresh } from '#deploy/deploy-cache-refresh.ts';
import { deployCaddy } from '#deploy/deploy-caddy.ts';
import { loadDeployConfig, printDeployConfig } from '#deploy/deploy-config.ts';
import { deployMedia, MediaPathMissingError } from '#deploy/deploy-media.ts';
import { deployOg } from '#deploy/deploy-og.ts';
import { verifyEdge } from '#deploy/verify-edge.ts';
import { ensureSshKeychain, findWorkspaceRoot } from '#shared/utils.ts';
import { generateSitemapLastmod } from '#sitemap-lastmod/index.ts';

const rootPath = findWorkspaceRoot();

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'dry-run': { default: false, type: 'boolean' },
		'skip-build': { default: false, type: 'boolean' },
	},
});

const isDryRun = values['dry-run'];
const isSkipBuild = values['skip-build'];

// Load and validate deploy configuration
const config = loadDeployConfig();

printDeployConfig(config);

const distPath = path.join(rootPath, 'dist');

await ensureSshKeychain();

async function build() {
	if (isSkipBuild) {
		console.log(chalk.yellow('Skipping build'));
		return;
	}
	console.log(chalk.blue('Building...'));
	await $({ cwd: rootPath, stdio: 'inherit' })`pnpm astro build`;
}

async function caddy() {
	await deployCaddy({ dryRun: isDryRun, rootPath });
}

async function generateOpenGraph() {
	console.log(chalk.blue('Generating OpenGraph images...'));
	await $({
		cwd: rootPath,
		stdio: 'inherit',
	})`pnpm og-image --dist-path=${distPath}`;
}

async function generateRedirects() {
	console.log(chalk.blue('Generating redirects...'));
	await $({ cwd: rootPath, stdio: 'inherit' })`pnpm generate-redirects`;
}

async function media() {
	try {
		await deployMedia({ dryRun: isDryRun, rootPath });
	} catch (error) {
		if (error instanceof MediaPathMissingError) {
			console.log(chalk.yellow('Media path not found, skipping'));
			return;
		}
		throw error;
	}
}

async function similar() {
	console.log(chalk.blue('Generating similar content...'));
	await $({
		cwd: rootPath,
		stdio: 'inherit',
	})`pnpm similar-content`;
}

// Content scripts read the store `astro sync` writes, so it has to run first
async function sync() {
	console.log(chalk.blue('Syncing content...'));
	await $({ cwd: rootPath, stdio: 'inherit' })`pnpm astro sync --mode production`;
}

async function test() {
	console.log(chalk.blue('Running E2E smoke tests...'));
	await $({ cwd: rootPath, stdio: 'inherit' })`pnpm test-e2e`;
}

async function transfer() {
	await deployApp({ dryRun: isDryRun, rootPath });
}

async function transferOpenGraph() {
	await deployOg({ dryRun: isDryRun, rootPath });
}

async function validate() {
	console.log(chalk.blue('Validating content...'));
	await $({ cwd: rootPath, stdio: 'inherit' })`pnpm -F @spectralcodex/scripts validate-content`;
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
			cwd: rootPath,
			stdio: 'inherit',
		})`pnpm webmentions`;
	} catch {
		console.log(chalk.yellow('Webmention fetch failed, continuing with existing data'));
	}
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
