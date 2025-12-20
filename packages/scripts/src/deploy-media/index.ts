#!/usr/bin/env tsx
/**
 * Syncs media files to the remote server.
 * Usage: pnpm deploy-media [fast] [--dry-run]
 */
import chalk from 'chalk';
import dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

const { values, positionals } = parseArgs({
	args: process.argv.slice(2),
	options: {
		'root-path': { type: 'string', default: process.cwd() },
		'dry-run': { type: 'boolean', default: false },
	},
	allowPositionals: true,
});

dotenv.config({ path: path.join(values['root-path'], '.env') });

const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';
const mediaPath = path.join(values['root-path'], mediaPathRelative);
const remoteHost = process.env.DEPLOY_REMOTE_HOST;
const sshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;
const remotePath = '/mnt/storage/media';
const dryRun = values['dry-run'];
const useSizeOnly = positionals[0] === 'fast';

$.verbose = true;

try {
	const stats = await fs.stat(mediaPath);
	if (!stats.isDirectory()) {
		console.error(chalk.red(`Not a directory: ${mediaPath}`));
		process.exit(1);
	}
} catch {
	console.error(chalk.red(`Media path not found: ${mediaPath}`));
	process.exit(1);
}

if (!remoteHost || !sshKeyPath) {
	console.error(chalk.red('Missing DEPLOY_REMOTE_HOST or DEPLOY_SSH_KEY_PATH in .env'));
	process.exit(1);
}

console.log(chalk.blue.bold('Deploy Media'));
console.log(chalk.gray(`  From: ${mediaPath}`));
console.log(chalk.gray(`  To:   ${remoteHost}:${remotePath}`));
console.log(chalk.gray(`  Mode: ${useSizeOnly ? 'fast (size-only)' : 'checksum'}`));
if (dryRun) console.log(chalk.yellow('  DRY RUN'));

const rsyncArgs = [
	'-av',
	'--progress',
	'--partial',
	...(useSizeOnly ? ['--size-only'] : ['-c']),
	'-e',
	`ssh -i ${sshKeyPath}`,
	'--exclude=.DS_Store',
	'--exclude=*.tmp',
	'--exclude=.gitkeep',
	...(dryRun ? ['--dry-run'] : []),
	`${mediaPath}/`,
	`${remoteHost}:${remotePath}/`,
];

try {
	const start = Date.now();
	await $`rsync ${rsyncArgs}`;
	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
} catch (error) {
	console.error(chalk.red('Sync failed:'), error);
	process.exit(1);
}
