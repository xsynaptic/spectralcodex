#!/usr/bin/env tsx
import chalk from 'chalk';
import dotenv from 'dotenv';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

interface DeployMediaOptions {
	rootPath: string;
	dryRun?: boolean;
	fast?: boolean;
}

export async function deployMedia(options: DeployMediaOptions): Promise<void> {
	const { rootPath, dryRun = false, fast = false } = options;

	dotenv.config({ path: path.join(rootPath, '.env') });

	const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';
	const mediaPath = path.join(rootPath, mediaPathRelative);
	const remoteHost = process.env.DEPLOY_REMOTE_HOST;
	const sshKeyPath = process.env.DEPLOY_SSH_KEY_PATH;
	const remotePath = '/mnt/storage/media';

	const stats = await fs.stat(mediaPath).catch(() => {
		// Return undefined implicitly
	});

	if (!stats?.isDirectory()) {
		throw new Error(`Media path not found: ${mediaPath}`);
	}

	if (!remoteHost || !sshKeyPath) {
		throw new Error('Missing DEPLOY_REMOTE_HOST or DEPLOY_SSH_KEY_PATH');
	}

	console.log(chalk.blue('Syncing media...'));
	console.log(chalk.gray(`  From: ${mediaPath}`));
	console.log(chalk.gray(`  To:   ${remoteHost}:${remotePath}`));
	console.log(chalk.gray(`  Mode: ${fast ? 'fast (size-only)' : 'checksum'}`));

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const rsyncArgs = [
		'-av',
		'--progress',
		'--partial',
		...(fast ? ['--size-only'] : ['-c']),
		'-e',
		`ssh -i ${sshKeyPath}`,
		'--exclude=.DS_Store',
		'--exclude=*.tmp',
		'--exclude=.gitkeep',
		...(dryRun ? ['--dry-run'] : []),
		`${mediaPath}/`,
		`${remoteHost}:${remotePath}/`,
	];

	const start = Date.now();

	await $({ stdio: 'inherit' })`rsync ${rsyncArgs}`;

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.endsWith('index.ts') && scriptPath.includes('deploy-media')) {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dry-run': { type: 'boolean', default: false },
		},
		allowPositionals: true,
	});

	try {
		await $`ssh-add --apple-load-keychain 2>/dev/null`;
	} catch {
		// Ignore
	}

	await deployMedia({
		rootPath: values['root-path'],
		dryRun: values['dry-run'],
		fast: positionals[0] === 'fast',
	});
}
