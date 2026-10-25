import { existsSync, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { DerivativeJob } from '#run-derivatives.ts';

import { runDerivatives } from '#run-derivatives.ts';

let directory: string;
let statePath: string;

function createJob(name: string, key = 'key'): DerivativeJob {
	return { key, name, render: () => Promise.resolve(new TextEncoder().encode(name)) };
}

function run(jobs: ReadonlyArray<DerivativeJob>) {
	return runDerivatives({ directory, jobs, statePath });
}

beforeEach(async () => {
	const root = await fs.mkdtemp(path.join(tmpdir(), 'run-derivatives-'));

	directory = path.join(root, 'files');
	statePath = path.join(root, 'state');
});

afterEach(async () => {
	await fs.rm(path.dirname(directory), { force: true, recursive: true });
});

describe('runDerivatives', () => {
	test('a recorded key without its file is stale, so a cleared directory redraws', async () => {
		await run([createJob('a.jpg')]);
		await fs.rm(path.join(directory, 'a.jpg'));

		const counts = await run([createJob('a.jpg')]);

		expect(counts.rendered).toBe(1);
		expect(existsSync(path.join(directory, 'a.jpg'))).toBe(true);
	});

	test('a changed key renders again, and identical bytes leave the file unwritten', async () => {
		await run([createJob('a.jpg'), createJob('b.jpg')]);

		const jobs = [createJob('a.jpg'), createJob('b.jpg', 'other')];

		expect(await run(jobs)).toMatchObject({ fresh: 1, rendered: 1, written: 0 });
	});

	test('a reported failure leaves the other jobs written and its own name stale', async () => {
		const failing = {
			key: 'key',
			name: 'b.jpg',
			render: () => Promise.reject(new Error('broken')),
		} satisfies DerivativeJob;
		const counts = await runDerivatives({
			directory,
			jobs: [createJob('a.jpg'), failing],
			onFailure: 'report',
			statePath,
		});

		expect(counts.failures).toEqual([{ message: 'broken', name: 'b.jpg' }]);
		expect(await run([createJob('a.jpg'), createJob('b.jpg')])).toMatchObject({
			fresh: 1,
			rendered: 1,
		});
	});
});
