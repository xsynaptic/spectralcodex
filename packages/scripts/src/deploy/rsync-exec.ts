import chalk from 'chalk';
import { $ } from 'zx';

interface RsyncOptions {
	archive?: 'av' | 'avz';
	config: SshTarget;
	dryRun?: boolean;
	excludes?: Array<string>;
	extraFlags?: Array<string>;
	quiet?: boolean;
}

interface SshTarget {
	remoteHost: string;
	sshKeyPath?: string;
}

export function buildRsyncArgs(
	source: Array<string> | string,
	destination: string,
	options: RsyncOptions,
): Array<string> {
	const { config, dryRun = false, extraFlags = [], excludes = [] } = options;

	return [
		...getArchiveFlags(options),
		...(config.sshKeyPath ? ['-e', `ssh -i ${config.sshKeyPath}`] : []),
		...excludes.map((pattern) => `--exclude=${pattern}`),
		...extraFlags,
		...(dryRun ? ['--dry-run'] : []),
		...(Array.isArray(source) ? source : [source]),
		destination,
	];
}

export async function rsyncTo(
	source: Array<string> | string,
	destination: string,
	options: RsyncOptions,
): Promise<string> {
	const command = $({
		stdio: ['inherit', 'pipe', 'inherit'],
	})`rsync ${buildRsyncArgs(source, destination, options)}`;

	command.pipe(process.stdout);

	const result = await command;

	return result.stdout;
}

// Like sshExec but captures and returns stdout
export async function sshCapture(config: SshTarget, command: string): Promise<string> {
	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	const result = await $`ssh ${sshArgs} ${command}`;

	return result.stdout;
}

// For dry-run, print the command instead of running it so a deploy preview shows remote actions
export async function sshExec(
	config: SshTarget,
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
	config: SshTarget,
	command: string,
	input: string,
): Promise<void> {
	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	await $({ stdio: ['pipe', 'inherit', 'inherit'], input })`ssh ${sshArgs} ${command}`;
}

// Callers that parse the returned file list need `-v`; a quiet pull prints nothing on success
function getArchiveFlags({ archive = 'avz', quiet = false }: RsyncOptions) {
	return quiet ? [`-${archive.replace('v', '')}`] : [`-${archive}`, '--progress'];
}
