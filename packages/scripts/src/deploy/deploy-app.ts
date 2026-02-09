#!/usr/bin/env tsx
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';

interface DeployAppOptions {
	rootPath: string;
	dryRun?: boolean;
	skipDelete?: boolean;
}

export async function deployApp(options: DeployAppOptions): Promise<void> {
	const { rootPath, dryRun = false, skipDelete = false } = options;

	// Load deploy configuration
	const config = loadDeployConfig(rootPath);

	const distPath = path.join(rootPath, 'dist');

	console.log(chalk.blue('Transferring app...'));
	console.log(chalk.gray(`  From: ${distPath}`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${config.sitePath}`));

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const rsyncArgs = [
		'-avz',
		'--progress',
		'-e',
		`ssh -i ${config.sshKeyPath}`,
		...(skipDelete ? [] : ['--delete-after']),
		...(dryRun ? ['--dry-run'] : []),
		`${distPath}/`,
		`${config.remoteHost}:${config.sitePath}/`,
	];

	const start = Date.now();

	await $({ stdio: 'inherit' })`rsync ${rsyncArgs}`;

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-app')) {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dry-run': { type: 'boolean', default: false },
			'skip-delete': { type: 'boolean', default: false },
		},
	});

	await ensureSshKeychain();

	await deployApp({
		rootPath: values['root-path'],
		dryRun: values['dry-run'],
		skipDelete: values['skip-delete'],
	});
}
