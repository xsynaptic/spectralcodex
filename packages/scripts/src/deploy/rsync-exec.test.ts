import { describe, expect, test } from 'vitest';

import { buildRsyncArgs, describeRsyncSummary, parseRsyncChange } from '#deploy/rsync-exec.ts';

function makeConfig(sshKeyPath?: string) {
	return {
		remoteHost: 'deploy@host',
		...(sshKeyPath === undefined ? {} : { sshKeyPath }),
	};
}

const sshCommand: unknown = expect.stringMatching(/^ssh -o ControlMaster=auto /);

function getSshCommand(args: Array<string>) {
	return args[args.indexOf('-e') + 1];
}

describe('buildRsyncArgs', () => {
	test('defaults to compressed, itemized archive with stats over the shared ssh connection', () => {
		expect(buildRsyncArgs('dist/', 'host:/path', { config: makeConfig() })).toEqual([
			'-azi',
			'--stats',
			'-e',
			sshCommand,
			'dist/',
			'host:/path',
		]);
	});

	test('passes the ssh key through the ssh command', () => {
		const args = buildRsyncArgs('dist/', 'host:/path', { config: makeConfig('/k') });

		expect(getSshCommand(args)).toMatch(/ -i \/k$/);
	});

	test('treats an empty ssh key path as absent', () => {
		const args = buildRsyncArgs('dist/', 'host:/path', { config: makeConfig('') });

		expect(getSshCommand(args)).not.toContain('-i');
	});

	test('skips compression for payloads that are already compressed', () => {
		expect(
			buildRsyncArgs('media/', 'host:/path/', { compress: false, config: makeConfig() }),
		).toEqual(['-ai', '--stats', '-e', sshCommand, 'media/', 'host:/path/']);
	});

	test('emits excludes in order, ahead of extra flags', () => {
		const args = buildRsyncArgs('dist/', 'host:/path', {
			config: makeConfig(),
			excludes: ['manifest.json', '*.tmp'],
			extraFlags: ['--checksum'],
		});

		expect(args).toEqual([
			'-azi',
			'--stats',
			'-e',
			sshCommand,
			'--exclude=manifest.json',
			'--exclude=*.tmp',
			'--checksum',
			'dist/',
			'host:/path',
		]);
	});

	test('keeps a destructive flag ahead of dry-run, and dry-run ahead of the source', () => {
		const args = buildRsyncArgs('dist/', 'host:/path', {
			config: makeConfig(),
			dryRun: true,
			extraFlags: ['--delete-after'],
		});

		expect(args).toEqual([
			'-azi',
			'--stats',
			'-e',
			sshCommand,
			'--delete-after',
			'--dry-run',
			'dist/',
			'host:/path',
		]);
	});
});

describe('parseRsyncChange', () => {
	test('tells new files from updated ones', () => {
		expect(parseRsyncChange('>f+++++++++ a/x.txt')).toEqual({ kind: 'new', path: 'a/x.txt' });
		expect(parseRsyncChange('>f..t...... Caddyfile')).toEqual({
			kind: 'updated',
			path: 'Caddyfile',
		});
	});

	test('counts deleted files but not deleted directories', () => {
		expect(parseRsyncChange('*deleting   old/z.txt')).toEqual({
			kind: 'removed',
			path: 'old/z.txt',
		});
		expect(parseRsyncChange('*deleting   old/')).toBeUndefined();
	});

	test('ignores directory, attribute-only and stats lines', () => {
		expect(parseRsyncChange('cd+++++++++ a/')).toBeUndefined();
		expect(parseRsyncChange('.d..t...... ./')).toBeUndefined();
		expect(parseRsyncChange('.f...p..... a/x.txt')).toBeUndefined();
		expect(parseRsyncChange('Total bytes sent: 7,116,637')).toBeUndefined();
	});

	test('keeps spaces inside a path', () => {
		expect(parseRsyncChange('>f.st...... og/a b.jpg')?.path).toBe('og/a b.jpg');
	});
});

describe('describeRsyncSummary', () => {
	test('reports nothing to do as no changes', () => {
		expect(describeRsyncSummary({ bytesSent: 121, changes: [] })).toBe('no changes');
	});

	test('orders counts new, updated, removed and skips empty kinds', () => {
		expect(
			describeRsyncSummary({
				bytesSent: 7_116_637,
				changes: [
					{ kind: 'removed', path: 'a' },
					{ kind: 'new', path: 'b' },
					{ kind: 'removed', path: 'c' },
				],
			}),
		).toBe('1 new, 2 removed · 7.1 MB sent');
	});
});
