#!/usr/bin/env tsx
import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';

interface DeployMediaOptions {
	rootPath: string;
	dryRun?: boolean;
	fast?: boolean;
}

export async function deployMedia(options: DeployMediaOptions): Promise<void> {
	const { rootPath, dryRun = false, fast = false } = options;

	// Load deploy configuration
	const config = loadDeployConfig(rootPath);

	const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';
	const mediaPath = path.join(rootPath, mediaPathRelative);

	const stats = await fs.stat(mediaPath).catch(() => {
		// Return undefined implicitly
	});

	if (!stats?.isDirectory()) {
		throw new Error(`Media path not found: ${mediaPath}`);
	}

	// Remote path is project root + /media subfolder
	const remoteMediaPath = `${config.mediaPath}/media`;

	console.log(chalk.blue('Syncing media...'));
	console.log(chalk.gray(`  From: ${mediaPath}`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${remoteMediaPath}`));
	console.log(chalk.gray(`  Mode: ${fast ? 'fast (size-only)' : 'checksum'}`));

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const rsyncArgs = [
		'-av',
		'--progress',
		'--partial',
		...(fast ? ['--size-only'] : ['-c']),
		'-e',
		`ssh -i ${config.sshKeyPath}`,
		'--exclude=.DS_Store',
		'--exclude=*.tmp',
		'--exclude=.gitkeep',
		...(dryRun ? ['--dry-run'] : []),
		`${mediaPath}/`,
		`${config.remoteHost}:${remoteMediaPath}/`,
	];

	const start = Date.now();

	await $({ stdio: 'inherit' })`rsync ${rsyncArgs}`;

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-media')) {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dry-run': { type: 'boolean', default: false },
		},
		allowPositionals: true,
	});

	await ensureSshKeychain();

	await deployMedia({
		rootPath: values['root-path'],
		dryRun: values['dry-run'],
		fast: positionals[0] === 'fast',
	});
}
