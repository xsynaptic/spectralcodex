#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { $ } from 'zx';

import { findWorkspaceRoot } from '../shared/utils.js';

const rootPath = findWorkspaceRoot();
const composePath = path.join(import.meta.dirname, 'docker-compose.yml');

const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';

// Docker needs an absolute host path; don't mutate CONTENT_MEDIA_PATH itself, the astro dev child inherits it
process.env.CONTENT_MEDIA_PATH_HOST = path.resolve(rootPath, mediaPathRelative);
process.env.IMAGE_SERVER_NGINX_CONFIG = path.resolve(rootPath, 'deploy/nginx.conf.template');

$.verbose = false;

function log(message: string) {
	console.log(
		`${chalk.gray(new Date().toLocaleTimeString('en-US', { hour12: false }))} ${chalk.cyan('[dev-server]')} ${message}`,
	);
}

try {
	await $`docker info`.quiet();
} catch {
	console.error(chalk.red('\n  Docker daemon is not running.\n'));
	process.exit(1);
}

let cleanedUp = false;

async function cleanup() {
	if (cleanedUp) return;
	cleanedUp = true;
	log(chalk.gray('Stopping containers...'));
	try {
		await $`docker compose -f ${composePath} --project-directory ${rootPath} down`.quiet();
	} catch {
		// already shutting down; teardown errors are not actionable
	}
	process.exit(0);
}

process.on('SIGINT', () => void cleanup());
process.on('SIGTERM', () => void cleanup());

log('Starting containers...');

async function startContainers() {
	try {
		await $`docker compose -f ${composePath} --project-directory ${rootPath} up -d --remove-orphans`.quiet();
		log(chalk.green('Containers ready'));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		log(chalk.red(`Container error: ${message}`));
	}
}

// eslint-disable-next-line unicorn/prefer-top-level-await -- fire-and-forget container startup; awaiting would block the dev server
void startContainers();

// Run the bin directly; `npx` warns about deprecations and `pnpm exec` prints a spurious error when exiting
const astroBinPath = path.join(rootPath, 'node_modules', '.bin', 'astro');

try {
	await $({ stdio: 'inherit', cwd: rootPath })`${astroBinPath} dev`;
} catch {
	// astro dev exited (Ctrl+C or crash); fall through to teardown
}

await cleanup();
