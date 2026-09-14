import { openGraphBasePath } from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import path from 'node:path';

import { loadDeployConfig } from '#deploy/deploy-config.ts';
import { rsyncTo } from '#deploy/rsync-exec.ts';

interface DeployAppOptions {
	dryRun?: boolean;
	rootPath: string;
	skipDelete?: boolean;
}

export async function deployApp(options: DeployAppOptions): Promise<void> {
	const { dryRun = false, rootPath, skipDelete = false } = options;

	const config = loadDeployConfig();

	const distPath = path.join(rootPath, 'dist');

	console.log(chalk.blue('Transferring app...'));
	console.log(chalk.gray(`  From: ${distPath}`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${config.sitePath}`));

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	await rsyncTo(`${distPath}/`, `${config.remoteHost}:${config.sitePath}/`, {
		config,
		dryRun,
		excludes: [`/${openGraphBasePath}/`],
		extraFlags: skipDelete ? [] : ['--delete-after'],
	});

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}
