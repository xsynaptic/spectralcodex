import chalk from 'chalk';
import * as fs from 'node:fs/promises';
import path from 'node:path';

import { collectMediaFiles } from '#shared/images.ts';

import { loadDeployConfig } from './deploy-config.ts';
import { rsyncTo } from './rsync-exec.ts';

interface DeployMediaOptions {
	rootPath: string;
	dryRun?: boolean;
	withDelete?: boolean;
}

async function isDirectory(targetPath: string): Promise<boolean> {
	try {
		const stats = await fs.stat(targetPath);

		return stats.isDirectory();
	} catch {
		return false;
	}
}

async function resolveMediaPath(rootPath: string): Promise<string> {
	const mediaPathRelative = process.env.CONTENT_MEDIA_PATH ?? 'packages/content/media';
	const mediaPath = path.join(rootPath, mediaPathRelative);

	if (!(await isDirectory(mediaPath))) {
		throw new Error(`Media path not found: ${mediaPath}`);
	}

	return mediaPath;
}

export async function deployMedia(options: DeployMediaOptions): Promise<void> {
	const { rootPath, dryRun = false, withDelete = false } = options;

	const config = loadDeployConfig();

	const mediaPath = await resolveMediaPath(rootPath);

	const remoteMediaPath = `${config.mediaPath}/media`;

	console.log(chalk.blue('Syncing media...'));
	console.log(chalk.gray(`  From: ${mediaPath}`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${remoteMediaPath}`));

	if (withDelete) {
		const localFileCount = collectMediaFiles(mediaPath).size;

		if (localFileCount === 0) {
			throw new Error(`No image files found in ${mediaPath}; refusing to delete`);
		}

		console.log(
			chalk.yellow(
				`  DELETE: remote files absent from the ${localFileCount.toString()} local files will be removed`,
			),
		);
	}

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	await rsyncTo(`${mediaPath}/`, `${config.remoteHost}:${remoteMediaPath}/`, {
		config,
		dryRun,
		archive: 'av',
		extraFlags: withDelete ? ['--partial', '--size-only', '--delete-after'] : ['--partial', '-c'],
		excludes: ['.DS_Store', '*.tmp', '.gitkeep'],
	});

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}
