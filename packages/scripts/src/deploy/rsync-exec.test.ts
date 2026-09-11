import { describe, expect, test } from 'vitest';

import type { DeployConfig } from '#deploy/deploy-config.ts';

import { buildRsyncArgs } from '#deploy/rsync-exec.ts';

function makeConfig(sshKeyPath?: string) {
	return {
		remoteHost: 'deploy@host',
		remotePath: '/opt/server',
		sitePath: '/var/www/site',
		siteUrl: 'https://example.com/',
		mediaPath: '/mnt/media',
		imageServerUrl: 'https://example.com/_img',
		...(sshKeyPath === undefined ? {} : { sshKeyPath }),
	} satisfies DeployConfig;
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
