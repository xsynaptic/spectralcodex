#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'node:path';
import { $ } from 'zx';

const rootPath = process.cwd();
const composePath = path.join(import.meta.dirname, 'docker-compose.yml');

// Load environment variables; the `.env.dev` file allows for a dev-only IPX secret to be set
dotenv.config({ path: path.join(rootPath, '.env'), quiet: true });
dotenv.config({ path: path.join(rootPath, '.env.dev'), override: true, quiet: true });

// Resolve paths to absolute for Docker
const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';
process.env.CONTENT_MEDIA_PATH = path.resolve(rootPath, mediaPathRelative);
process.env.DEPLOY_IMAGE_SERVER_PATH = path.resolve(rootPath, 'deploy/site/image-server');

$.verbose = false;

function log(message: string) {
	console.log(
		`${chalk.gray(new Date().toLocaleTimeString('en-US', { hour12: false }))} ${chalk.cyan('[docker]')} ${message}`,
	);
}

let cleanedUp = false;

function cleanup() {
	if (cleanedUp) return;
	cleanedUp = true;
	log(chalk.gray('Stopping containers...'));

	// Fire and forget - don't block exit
	void $`docker compose -f ${composePath} --project-directory ${rootPath} down`.quiet();
	process.exit(0);
}

process.on('SIGINT', () => {
	cleanup();
});
process.on('SIGTERM', () => {
	cleanup();
});

// Start Docker containers in background
log('Starting containers...');

$`docker compose -f ${composePath} --project-directory ${rootPath} up -d`.quiet()
	.then(() => {
		log(chalk.green('Containers ready'));
	})
	// eslint-disable-next-line unicorn/prefer-top-level-await
	.catch((error: unknown) => {
		if (error instanceof Error) {
			log(chalk.red(`Container error: ${error.message}`));
		} else {
			log(chalk.red(`Container error: ${String(error)}`));
		}
	});

try {
	await $({ stdio: 'inherit' })`npx astro dev`;
} catch {
	cleanup();
}
