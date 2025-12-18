#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

const { values } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
	},
});

const rootPath = values['root-path'];
const composePath = path.join(import.meta.dirname, 'docker-compose.yml');

$.verbose = false;

async function cleanup() {
	console.log(chalk.gray('\nStopping IPX containers...'));
	await $`docker compose -f ${composePath} --project-directory ${rootPath} down`.quiet();
}

process.on('SIGINT', () => {
	void cleanup().then(() => process.exit(0));
});

try {
	console.log(chalk.blue('Starting IPX containers...'));
	await $`docker compose -f ${composePath} --project-directory ${rootPath} up -d --build --force-recreate`;

	console.log(chalk.blue('Starting Astro dev server...\n'));
	$.cwd = rootPath;
	await $({ stdio: 'inherit' })`pnpm astro dev`;
} catch {
	// Astro dev was interrupted
} finally {
	await cleanup();
}
