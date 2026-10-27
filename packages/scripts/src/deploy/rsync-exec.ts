import type { ProcessOutput } from 'zx';

import { createStatus, formatBytes, formatCount, log } from '@xsynaptic/astro-scripts';
import chalk from 'chalk';
import { $ } from 'zx';

export async function ensureSshKeychain() {
	try {
		await $`ssh-add --apple-load-keychain 2>/dev/null`;
	} catch {
		// ssh-add fails off macOS or without a keychain, and then there is nothing to load
	}
}

interface RsyncArgsOptions {
	compress?: boolean;
	config: SshTarget;
	dryRun?: boolean;
	excludes?: ReadonlyArray<string>;
	extraFlags?: ReadonlyArray<string>;
}

interface RsyncOptions extends RsyncArgsOptions {
	label: string;
}

interface SshTarget {
	remoteHost: string;
	sshKeyPath?: string;
}

const rsyncChangeKinds = ['new', 'updated', 'removed'] as const;

export interface RsyncChange {
	kind: (typeof rsyncChangeKinds)[number];
	path: string;
}

export interface RsyncSummary {
	bytesSent: number;
	changes: Array<RsyncChange>;
}

const rollingWindowSize = 10;

// An itemized line is an 11-character change code and a space, then the path
const itemizePrefixLength = 12;

const bytesSentPattern = /^Total bytes sent: ([\d,]+)/;

export function buildRsyncArgs(
	source: Array<string> | string,
	destination: string,
	options: RsyncArgsOptions,
): Array<string> {
	const { config, dryRun = false, excludes = [], extraFlags = [] } = options;

	return [
		getArchiveFlag(options),
		'--stats',
		...(config.sshKeyPath ? ['-e', `ssh -i ${config.sshKeyPath}`] : []),
		...excludes.map((pattern) => `--exclude=${pattern}`),
		...extraFlags,
		...(dryRun ? ['--dry-run'] : []),
		...(Array.isArray(source) ? source : [source]),
		destination,
	];
}

function getArchiveFlag({ compress = true }: RsyncArgsOptions) {
	return compress ? '-azi' : '-ai';
}

export function parseRsyncChange(line: string): RsyncChange | undefined {
	const path = line.slice(itemizePrefixLength);

	if (line.startsWith('*deleting ')) {
		return path.endsWith('/') ? undefined : { kind: 'removed', path };
	}

	if (!/^[<>]f/.test(line)) return;

	return { kind: line.slice(2, 11) === '+++++++++' ? 'new' : 'updated', path };
}

export function formatRsyncChange(change: RsyncChange) {
	return `${change.kind.padEnd(8)}${change.path}`;
}

export function describeRsyncSummary({ bytesSent, changes }: RsyncSummary) {
	const counts = rsyncChangeKinds.flatMap((kind) => {
		const count = changes.filter((change) => change.kind === kind).length;

		return count > 0 ? [`${formatCount(count)} ${kind}`] : [];
	});

	if (counts.length === 0) return 'no changes';

	return `${counts.join(', ')} · ${formatBytes(bytesSent)} sent`;
}

function truncateStart(text: string, width: number) {
	return text.length <= width ? text : `…${text.slice(-(width - 1))}`;
}

function createRollingWindow(label: string) {
	const status = createStatus(label);
	const recent: Array<RsyncChange> = [];
	let count = 0;

	function render() {
		const pathWidth = (process.stderr.columns || 80) - 12;
		const lines = recent.map((change) =>
			chalk.gray(`    ${change.kind.padEnd(8)}${truncateStart(change.path, pathWidth)}`),
		);

		status.update([`${label} · ${formatCount(count)} changed`, ...lines].join('\n'));
	}

	return {
		add(change: RsyncChange) {
			count += 1;
			recent.push(change);
			if (recent.length > rollingWindowSize) recent.shift();
			render();
		},
		clear() {
			status.stop();
		},
		fail() {
			status.fail();
		},
	};
}

function readStderrLines(output: ProcessOutput) {
	return output.stderr
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

function collectRsyncLine(summary: RsyncSummary, line: string) {
	const change = parseRsyncChange(line);

	if (change) {
		summary.changes.push(change);
		return change;
	}

	const bytesSent = bytesSentPattern.exec(line)?.[1];

	if (bytesSent !== undefined) summary.bytesSent = Number(bytesSent.replaceAll(',', ''));

	return;
}

export async function rsyncTo(
	source: Array<string> | string,
	destination: string,
	options: RsyncOptions,
): Promise<RsyncSummary> {
	const command = $({
		quiet: true,
		stdio: ['inherit', 'pipe', 'pipe'],
	})`rsync ${buildRsyncArgs(source, destination, options)}`;
	const window = createRollingWindow(options.label);
	const summary: RsyncSummary = { bytesSent: 0, changes: [] };

	try {
		for await (const line of command) {
			const change = collectRsyncLine(summary, line);

			if (change) window.add(change);
		}
	} catch (error) {
		window.fail();
		throw error;
	}

	window.clear();

	const output = await command;

	for (const line of readStderrLines(output)) log.warn(line);

	return summary;
}

export async function sshCapture(config: SshTarget, command: string): Promise<string> {
	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	const result = await $`ssh ${sshArgs} ${command}`;

	return result.stdout;
}

export async function sshCaptureUnchecked(
	config: SshTarget,
	command: string,
): Promise<ProcessOutput> {
	const sshArgs = [...(config.sshKeyPath ? ['-i', config.sshKeyPath] : []), config.remoteHost];

	return await $({ nothrow: true, quiet: true })`ssh ${sshArgs} ${command}`;
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
