#!/usr/bin/env tsx
import { OPEN_GRAPH_BASE_PATH } from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { ensureSshKeychain, findWorkspaceRoot } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';
import { rsyncTo } from './rsync-exec.js';

interface DeployAppOptions {
	rootPath: string;
	dryRun?: boolean;
	skipDelete?: boolean;
}

export async function deployApp(options: DeployAppOptions): Promise<void> {
	const { rootPath, dryRun = false, skipDelete = false } = options;

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
		excludes: [`/${OPEN_GRAPH_BASE_PATH}/`, '/shrine-app/', '/ruin-app/'],
		extraFlags: skipDelete ? [] : ['--delete-after'],
	});

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-app')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'dry-run': { type: 'boolean', default: false },
			'skip-delete': { type: 'boolean', default: false },
		},
	});

	await ensureSshKeychain();

	await deployApp({
		rootPath: findWorkspaceRoot(),
		dryRun: values['dry-run'],
		skipDelete: values['skip-delete'],
	});
}
