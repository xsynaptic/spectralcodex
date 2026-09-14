import { describe, expect, test } from 'vitest';

import { buildRsyncArgs } from '#deploy/rsync-exec.ts';

function makeConfig(sshKeyPath?: string) {
	return {
		remoteHost: 'deploy@host',
		...(sshKeyPath === undefined ? {} : { sshKeyPath }),
	};
}

describe('buildRsyncArgs', () => {
	test('defaults to archive plus compression with no ssh flag', () => {
		expect(buildRsyncArgs('dist/', 'host:/path', { config: makeConfig() })).toEqual([
			'-avz',
			'--progress',
			'dist/',
			'host:/path',
		]);
	});

	test('places the ssh key flag directly after progress', () => {
		expect(buildRsyncArgs('dist/', 'host:/path', { config: makeConfig('/k') })).toEqual([
			'-avz',
			'--progress',
			'-e',
			'ssh -i /k',
			'dist/',
			'host:/path',
		]);
	});

	test('treats an empty ssh key path as absent', () => {
		expect(buildRsyncArgs('dist/', 'host:/path', { config: makeConfig('') })).not.toContain('-e');
	});

	test('drops verbosity and progress when quiet, keeping compression', () => {
		expect(
			buildRsyncArgs('host:/path/', 'backups/', { config: makeConfig(), quiet: true }),
		).toEqual(['-az', 'host:/path/', 'backups/']);
	});

	test('emits excludes in order, ahead of extra flags', () => {
		const args = buildRsyncArgs('dist/', 'host:/path', {
			config: makeConfig(),
			excludes: ['manifest.json', '*.tmp'],
			extraFlags: ['--checksum'],
		});

		expect(args).toEqual([
			'-avz',
			'--progress',
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
			extraFlags: ['--delete-after'],
			dryRun: true,
		});

		expect(args).toEqual([
			'-avz',
			'--progress',
			'--delete-after',
			'--dry-run',
			'dist/',
			'host:/path',
		]);
	});
});
