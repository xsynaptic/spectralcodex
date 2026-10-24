import { $ } from 'zx';

import { log } from '#shared/cli-output.ts';

export async function ensureSshKeychain() {
	try {
		await $`ssh-add --apple-load-keychain 2>/dev/null`;
	} catch {
		// ssh-add fails off macOS or without a keychain, and then there is nothing to load
	}
}

interface RsyncOptions {
	archive?: 'av' | 'avz';
	config: SshTarget;
	dryRun?: boolean;
	excludes?: ReadonlyArray<string>;
	extraFlags?: ReadonlyArray<string>;
	isProgressShown?: boolean;
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
	const { config, dryRun = false, excludes = [], extraFlags = [] } = options;

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
		log.warn(`Dry run; ssh: ${command}`);
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

	await $({ input, stdio: ['pipe', 'inherit', 'inherit'] })`ssh ${sshArgs} ${command}`;
}

// Callers that parse the returned file list need `-v`; a quiet pull prints nothing on success
function getArchiveFlags({ archive = 'avz', isProgressShown = true, quiet = false }: RsyncOptions) {
	if (quiet) return [`-${archive.replace('v', '')}`];

	return isProgressShown ? [`-${archive}`, '--progress'] : [`-${archive}`];
}
