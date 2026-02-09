#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';

interface CacheWarmOptions {
	rootPath: string;
	nginxUrl?: string;
	concurrency?: number;
	random?: boolean;
	dryRun?: boolean;
}

interface CacheWarmConfig {
	remoteHost: string;
	sshKeyPath: string;
	sitePath: string;
	nginxUrl: string;
	concurrency: number;
	random: boolean;
	dryRun: boolean;
}

function loadCacheWarmConfig(options: CacheWarmOptions): CacheWarmConfig {
	const {
		rootPath,
		nginxUrl = 'http://localhost:3100',
		concurrency = 2,
		random = false,
		dryRun = false,
	} = options;

	dotenv.config({ path: path.join(rootPath, '.env'), quiet: true });
	dotenv.config({ path: path.join(rootPath, 'deploy/.env'), quiet: true });

	const remoteHost = process.env.DEPLOY_REMOTE_HOST;
	const sshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;
	const sitePath = process.env.DEPLOY_SITE_PATH;

	if (!remoteHost || !sshKeyPath || !sitePath) {
		throw new Error('Missing DEPLOY_REMOTE_HOST, DEPLOY_SSH_KEY_PATH, or DEPLOY_SITE_PATH');
	}

	return { remoteHost, sshKeyPath, sitePath, nginxUrl, concurrency, random, dryRun };
}

async function runWarmScript(config: CacheWarmConfig, manifestFile: string): Promise<void> {
	const { remoteHost, sshKeyPath, sitePath, nginxUrl, concurrency, random, dryRun } = config;
	const manifestPath = `${sitePath}/${manifestFile}`;

	await ensureSshKeychain();

	$.verbose = false;

	const sshArgs = ['-i', sshKeyPath, remoteHost];

	const remoteScript = dryRun
		? `
			if [ ! -f "${manifestPath}" ]; then
				echo "Error: Manifest not found at ${manifestPath}"
				exit 1
			fi
			COUNT=$(jq length "${manifestPath}")
			echo "Would be warming $COUNT URLs with concurrency ${String(concurrency)}"
		`
		: `
			if [ ! -f "${manifestPath}" ]; then
				echo "Error: Manifest not found at ${manifestPath}"
				exit 1
			fi

			COUNT=$(jq length "${manifestPath}")
			if [ "$COUNT" -eq 0 ]; then
				echo "No URLs to warm"
				exit 0
			fi

			echo "Warming $COUNT URLs with concurrency ${String(concurrency)}..."

			START=$(date +%s)
			DONE=0

			jq -r '.[]' "${manifestPath}"${random ? ' | shuf' : ''} | \\
				xargs -P ${String(concurrency)} -I {} sh -c '
					RESP=$(curl -s -D - -o /dev/null -w "%{http_code} %{time_total}s" "${nginxUrl}{}")
					CACHE=$(echo "$RESP" | grep -o "X-Cache-Status: [A-Z]*" | cut -d" " -f2)
					STATS=$(echo "$RESP" | tail -1)
					echo "$STATS $CACHE {}"
				'

			END=$(date +%s)
			DURATION=$((END - START))

			echo "Done in \${DURATION}s"
		`;

	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${remoteScript}`;
}

export async function cacheWarm(options: CacheWarmOptions): Promise<void> {
	const config = loadCacheWarmConfig(options);

	console.log(chalk.blue('Warming image cache...'));
	if (config.dryRun) console.log(chalk.yellow('  DRY RUN'));

	await runWarmScript(config, 'cache-manifest.json');
}

export async function cacheWarmNew(options: CacheWarmOptions): Promise<void> {
	const config = loadCacheWarmConfig(options);

	console.log(chalk.blue('Warming new image cache...'));
	if (config.dryRun) console.log(chalk.yellow('  DRY RUN'));

	await runWarmScript(config, 'cache-manifest-new.json');
}

// CLI entry point
if (process.argv[1]?.endsWith('cache-warm.ts')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'nginx-url': { type: 'string', default: 'http://localhost:3100' },
			concurrency: { type: 'string', default: '2' },
			random: { type: 'boolean', default: false },
			'dry-run': { type: 'boolean', default: false },
		},
	});

	await cacheWarm({
		rootPath: values['root-path'],
		nginxUrl: values['nginx-url'],
		concurrency: Number(values.concurrency),
		random: values.random,
		dryRun: values['dry-run'],
	});
}
