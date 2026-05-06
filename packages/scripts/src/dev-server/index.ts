#!/usr/bin/env tsx
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { $ } from 'zx';

// Must match deploy-image-server.ts so dev and deploy share the bundle
const IMAGE_NAME = 'spectralcodex-image-server';

const rootPath = process.cwd();
const composePath = path.join(import.meta.dirname, 'docker-compose.yml');
const bundlePath = `/tmp/${IMAGE_NAME}-bundle`;
const bundleMarker = path.join(bundlePath, 'dist/image-server.mjs');

const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';

process.env.CONTENT_MEDIA_PATH = path.resolve(rootPath, mediaPathRelative);
process.env.DEPLOY_IMAGE_SERVER_BUNDLE_PATH = bundlePath;

$.verbose = false;

function log(message: string) {
	console.log(
		`${chalk.gray(new Date().toLocaleTimeString('en-US', { hour12: false }))} ${chalk.cyan('[dev-server]')} ${message}`,
	);
}

// Abort early if Docker daemon is not running
try {
	await $`docker info`.quiet();
} catch {
	console.error(chalk.red('\n  Docker daemon is not running.\n'));
	process.exit(1);
}

async function maxMtimeMs(target: string): Promise<number> {
	const stats = await stat(target);

	if (!stats.isDirectory()) return stats.mtimeMs;

	const entries = await readdir(target, { withFileTypes: true });
	let max = stats.mtimeMs;

	for (const entry of entries) {
		const childMax = await maxMtimeMs(path.join(target, entry.name));
		if (childMax > max) max = childMax;
	}
	return max;
}

async function bundleStale(): Promise<boolean> {
	if (!existsSync(bundleMarker)) return true;

	const markerStat = await stat(bundleMarker);
	const markerMtime = markerStat.mtimeMs;
	const inputs = [
		path.join(rootPath, 'services/image-server/src'),
		path.join(rootPath, 'services/image-server/package.json'),
		path.join(rootPath, 'services/image-server/Dockerfile'),
		path.join(rootPath, 'pnpm-lock.yaml'),
	];

	for (const input of inputs) {
		const inputMtime = await maxMtimeMs(input);
		if (inputMtime > markerMtime) return true;
	}
	return false;
}

let cleanedUp = false;

function cleanup() {
	if (cleanedUp) return;
	cleanedUp = true;
	log(chalk.gray('Stopping containers...'));
	void $`docker compose -f ${composePath} --project-directory ${rootPath} down`.quiet();
	process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

const stale = await bundleStale();

if (stale) {
	log('Image-server source changed, rebuilding bundle...');
	await $({ stdio: 'inherit' })`pnpm --filter @xsynaptic/image-server build`;
	await $({ stdio: 'inherit' })`rm -rf ${bundlePath}`;
	await $({
		stdio: 'inherit',
	})`pnpm --filter @xsynaptic/image-server deploy --prod ${bundlePath}`;
} else {
	log('Image-server bundle up to date');
}

log('Starting containers...');

// Always pass --build: cheap when the bundle hasn't changed
$`docker compose -f ${composePath} --project-directory ${rootPath} up -d --build`
	.quiet()
	.then(() => {
		log(chalk.green('Containers ready'));
	})
	// eslint-disable-next-line unicorn/prefer-top-level-await
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		log(chalk.red(`Container error: ${message}`));
	});

try {
	await $({ stdio: 'inherit' })`npx astro dev`;
} catch {
	cleanup();
}
