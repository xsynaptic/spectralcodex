import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { loadDeployConfig } from './deploy-config.js';
import { rsyncTo } from './rsync-exec.js';

interface DeployMediaOptions {
	rootPath: string;
	dryRun?: boolean;
	fast?: boolean;
}

export async function deployMedia(options: DeployMediaOptions): Promise<void> {
	const { rootPath, dryRun = false, fast = false } = options;

	const config = loadDeployConfig();

	const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';
	const mediaPath = path.join(rootPath, mediaPathRelative);

	let isDirectory = false;

	try {
		const stats = await fs.stat(mediaPath);
		isDirectory = stats.isDirectory();
	} catch {
		// stat throws if the path is absent; the guard below handles it
	}

	if (!isDirectory) {
		throw new Error(`Media path not found: ${mediaPath}`);
	}

	const remoteMediaPath = `${config.mediaPath}/media`;

	console.log(chalk.blue('Syncing media...'));
	console.log(chalk.gray(`  From: ${mediaPath}`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${remoteMediaPath}`));
	console.log(chalk.gray(`  Mode: ${fast ? 'fast (size-only)' : 'checksum'}`));

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	await rsyncTo(`${mediaPath}/`, `${config.remoteHost}:${remoteMediaPath}/`, {
		config,
		dryRun,
		archive: 'av',
		extraFlags: ['--partial', fast ? '--size-only' : '-c'],
		excludes: ['.DS_Store', '*.tmp', '.gitkeep'],
	});

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}
