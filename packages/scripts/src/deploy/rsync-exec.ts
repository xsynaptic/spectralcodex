import chalk from 'chalk';
import { $ } from 'zx';

import type { DeployConfig } from './deploy-config.js';

interface RsyncOptions {
	config: DeployConfig;
	dryRun?: boolean;
	archive?: 'av' | 'avz';
	extraFlags?: Array<string>;
	excludes?: Array<string>;
}

function buildRsyncArgs(
	source: string | Array<string>,
	destination: string,
	{ config, dryRun = false, archive = 'avz', extraFlags = [], excludes = [] }: RsyncOptions,
): Array<string> {
	return [
		`-${archive}`,
		'--progress',
		...(config.sshKeyPath ? ['-e', `ssh -i ${config.sshKeyPath}`] : []),
		...excludes.map((pattern) => `--exclude=${pattern}`),
		...extraFlags,
		...(dryRun ? ['--dry-run'] : []),
		...(Array.isArray(source) ? source : [source]),
		destination,
	];
}

export async function rsyncTo(
	source: string | Array<string>,
	destination: string,
	options: RsyncOptions,
): Promise<void> {
	await $({ stdio: 'inherit' })`rsync ${buildRsyncArgs(source, destination, options)}`;
}

// For dry-run, print the command instead of running it so a deploy preview shows remote actions
export async function sshExec(
	config: DeployConfig,
	command: string,
	{ dryRun = false }: { dryRun?: boolean } = {},
): Promise<void> {
	if (dryRun) {
		console.log(chalk.yellow(`DRY RUN ssh: ${command}`));
		return;
	}

	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	await $({ stdio: 'inherit' })`ssh ${sshArgs} ${command}`;
}

// Feed the payload over stdin so secrets never appear on the remote command line (visible in `ps`)
export async function sshExecWithInput(
	config: DeployConfig,
	command: string,
	input: string,
): Promise<void> {
	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	await $({ stdio: ['pipe', 'inherit', 'inherit'], input })`ssh ${sshArgs} ${command}`;
}

// Like sshExec but captures and returns stdout
export async function sshCapture(config: DeployConfig, command: string): Promise<string> {
	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	const result = await $`ssh ${sshArgs} ${command}`;

	return result.stdout;
}
