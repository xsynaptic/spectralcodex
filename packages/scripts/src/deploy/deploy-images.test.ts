import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { $ } from 'zx';

import { renderedUploadOptions } from '#deploy/deploy-images.ts';
import { buildRsyncArgs } from '#deploy/rsync-exec.ts';

let rootPath: string;

async function runRsync(options: Omit<Parameters<typeof buildRsyncArgs>[2], 'config'>) {
	const args = buildRsyncArgs(
		`${path.join(rootPath, 'media')}/`,
		`${path.join(rootPath, 'remote')}/`,
		{
			...options,
			config: { remoteHost: 'local' },
		},
	);

	const result = await $({ quiet: true })`rsync ${args}`;

	return result.stdout;
}

async function syncOutputs() {
	const output = await runRsync(renderedUploadOptions);

	return output.split('\n');
}

beforeEach(() => {
	rootPath = mkdtempSync(path.join(os.tmpdir(), 'deploy-images-test-'));
	mkdirSync(path.join(rootPath, 'media/a'), { recursive: true });
	writeFileSync(path.join(rootPath, 'media/a/b-1-450.jpg'), 'jpeg bytes');
	writeFileSync(path.join(rootPath, 'media/a/b-1-450x300.webp'), 'webp bytes');
	writeFileSync(path.join(rootPath, 'media/a/b-1-600.jpg.tmp'), 'half an encode');
});

afterEach(() => {
	rmSync(rootPath, { force: true, recursive: true });
});

describe('the rendered upload', () => {
	test('a second run transfers nothing, so mtimes and ETags stay put', async () => {
		const first = await syncOutputs();

		expect(first.filter((line) => line.startsWith('>f'))).toHaveLength(2);
		expect(await syncOutputs()).not.toContainEqual(expect.stringMatching(/^>f/));
	});

	test('temp files stay behind and served files are world-readable', async () => {
		await syncOutputs();

		expect(() => statSync(path.join(rootPath, 'remote/a/b-1-600.jpg.tmp'))).toThrow();
		expect(statSync(path.join(rootPath, 'remote/a/b-1-450.jpg')).mode & 0o777).toBe(0o644);
		expect(statSync(path.join(rootPath, 'remote/a')).mode & 0o777).toBe(0o755);
	});
});
