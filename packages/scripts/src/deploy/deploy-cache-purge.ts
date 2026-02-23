#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'node:path';
import { parseArgs } from 'node:util';

interface PurgeCacheOptions {
	rootPath: string;
	dryRun?: boolean;
}

export async function purgeCache(options: PurgeCacheOptions): Promise<void> {
	const { rootPath, dryRun = false } = options;

	// Load env files (same as deploy-config)
	dotenv.config({ path: path.join(rootPath, '.env'), quiet: true });
	dotenv.config({ path: path.join(rootPath, 'deploy/.env'), quiet: true });

	const zoneId = process.env.CLOUDFLARE_ZONE_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;

	if (!zoneId || !apiToken) {
		console.log(
			chalk.yellow('Skipping cache purge: CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN not set'),
		);
		return;
	}

	console.log(chalk.blue('Purging Cloudflare cache...'));

	if (dryRun) {
		console.log(chalk.yellow('  DRY RUN: would purge all cached content'));
		return;
	}

	const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${apiToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ purge_everything: true }),
	});

	if (!response.ok) {
		throw new Error(`Cloudflare API returned ${String(response.status)}: ${response.statusText}`);
	}

	const result = (await response.json()) as {
		success: boolean;
		errors: Array<{ message: string }>;
	};

	if (!result.success) {
		const messages = result.errors.map((error) => error.message).join(', ');

		throw new Error(`Cloudflare cache purge failed: ${messages}`);
	}

	console.log(chalk.green('Cache purged'));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-cache-purge')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dry-run': { type: 'boolean', default: false },
		},
	});

	await purgeCache({
		rootPath: values['root-path'],
		dryRun: values['dry-run'],
	});
}
