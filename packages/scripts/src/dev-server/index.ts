#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { $ } from 'zx';

const rootPath = process.cwd();
const composePath = path.join(import.meta.dirname, 'docker-compose.yml');

$.verbose = false;

function timestamp() {
	return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function log(message: string) {
	console.log(`${chalk.gray(timestamp())} ${chalk.cyan('[docker]')} ${message}`);
}

let cleanedUp = false;

async function cleanup() {
	if (cleanedUp) return;
	cleanedUp = true;
	log(chalk.gray('Stopping containers...'));
	await $`docker compose -f ${composePath} --project-directory ${rootPath} down`.quiet();
	process.exit(0);
}

process.on('SIGINT', () => void cleanup());
process.on('SIGTERM', () => void cleanup());

const startTime = performance.now();
log('Starting containers...');
await $`docker compose -f ${composePath} --project-directory ${rootPath} up -d`;
log(`Ready ${chalk.bold(chalk.green(`${String(Math.round(performance.now() - startTime))}ms`))}`);

console.log();

try {
	await $({ stdio: 'inherit' })`npx astro dev`;
} catch {
	// Astro dev was interrupted
	await cleanup();
}
