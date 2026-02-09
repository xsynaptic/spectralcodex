#!/usr/bin/env tsx
import { OPEN_GRAPH_BASE_PATH, OPEN_GRAPH_IMAGE_FORMAT } from '@spectralcodex/shared/constants';
import chalk from 'chalk';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { $ } from 'zx';

import { ensureSshKeychain } from '../shared/utils.js';
import { loadDeployConfig } from './deploy-config.js';

interface DeployOgOptions {
	rootPath: string;
	dryRun?: boolean;
	ids?: Array<string>;
}

export async function deployOg(options: DeployOgOptions): Promise<void> {
	const { rootPath, dryRun = false, ids = [] } = options;

	const config = loadDeployConfig(rootPath);

	const ogImagePath = path.join(rootPath, '.cache/og-image');
	const remoteOgPath = `${config.sitePath}/${OPEN_GRAPH_BASE_PATH}`;

	console.log(chalk.blue('Syncing OG images...'));
	console.log(chalk.gray(`  From: ${ogImagePath}`));
	console.log(chalk.gray(`  To:   ${config.remoteHost}:${remoteOgPath}`));

	if (ids.length > 0) {
		console.log(chalk.gray(`  Files: ${String(ids.length)} specified`));
	}

	if (dryRun) console.log(chalk.yellow('  DRY RUN'));

	const start = Date.now();

	if (ids.length > 0) {
		// Sync specific files
		const files = ids.map((id) => `${id}.${OPEN_GRAPH_IMAGE_FORMAT}`);

		const rsyncArgs = [
			'-avz',
			'--progress',
			'-e',
			`ssh -i ${config.sshKeyPath}`,
			...(dryRun ? ['--dry-run'] : []),
			...files.map((f) => path.join(ogImagePath, f)),
			`${config.remoteHost}:${remoteOgPath}/`,
		];

		await $({ stdio: 'inherit' })`rsync ${rsyncArgs}`;
	} else {
		// Sync all files
		const rsyncArgs = [
			'-avz',
			'--progress',
			'-e',
			`ssh -i ${config.sshKeyPath}`,
			...(dryRun ? ['--dry-run'] : []),
			`${ogImagePath}/`,
			`${config.remoteHost}:${remoteOgPath}/`,
		];

		await $({ stdio: 'inherit' })`rsync ${rsyncArgs}`;
	}

	console.log(chalk.green(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s`));
}

// CLI entry point
const scriptPath = process.argv[1] ?? '';

if (scriptPath.includes('deploy-og')) {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			'root-path': { type: 'string', default: process.cwd() },
			'dry-run': { type: 'boolean', default: false },
		},
		allowPositionals: true,
	});

	await ensureSshKeychain();

	await deployOg({
		rootPath: values['root-path'],
		dryRun: values['dry-run'],
		ids: positionals,
	});
}
