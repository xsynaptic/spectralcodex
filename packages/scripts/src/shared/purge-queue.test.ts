import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as R from 'remeda';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { PurgeRequestBody } from '#shared/purge-queue.ts';

import { createPurgeQueue } from '#shared/purge-queue.ts';

const baseUrl = 'https://img.example.com/media';

let statePath: string;

async function queueNames(count: number) {
	const queue = await createPurgeQueue(statePath);
	const names = R.times(count, (index) => `a/image-${String(index)}-450.jpg`);

	for (const name of names) await queue.add(name);

	return { names, queue };
}

async function readQueuedCount() {
	const queue = await createPurgeQueue(statePath);

	return queue.size;
}

function createRecorder(onRequest?: (index: number) => Promise<void>) {
	const bodies: Array<PurgeRequestBody> = [];
	const request = async (body: PurgeRequestBody) => {
		bodies.push(body);
		await onRequest?.(bodies.length - 1);
	};

	return { bodies, request };
}

beforeEach(async () => {
	statePath = await fs.mkdtemp(path.join(tmpdir(), 'purge-queue-'));
	vi.spyOn(console, 'error').mockImplementation(R.doNothing());
});

afterEach(async () => {
	vi.restoreAllMocks();
	await fs.rm(statePath, { force: true, recursive: true });
});

describe('drain', () => {
	test('more than 2,000 queued paths purge the base URL prefix in one call', async () => {
		const { queue } = await queueNames(2001);
		const recorder = createRecorder();

		await queue.drain({ baseUrl, label: 'images', request: recorder.request });

		expect(recorder.bodies).toEqual([{ prefixes: ['img.example.com/media'] }]);
		expect(await readQueuedCount()).toBe(0);
	});

	test('fewer paths purge by URL in batches of 100, each removed only after its call', async () => {
		const { names, queue } = await queueNames(250);
		const queuedAtCall: Array<number> = [];
		const recorder = createRecorder(async () => {
			queuedAtCall.push(await readQueuedCount());
		});

		await queue.drain({ baseUrl, label: 'images', request: recorder.request });

		expect(recorder.bodies).toEqual(
			R.chunk(names, 100).map((batch) => ({ files: batch.map((name) => `${baseUrl}/${name}`) })),
		);
		expect(queuedAtCall).toEqual([250, 150, 50]);
		expect(await readQueuedCount()).toBe(0);
	});

	test('a failing batch leaves itself and every later batch queued', async () => {
		const { queue } = await queueNames(250);
		const recorder = createRecorder((index) => {
			if (index === 1) return Promise.reject(new Error('rate limited'));

			return Promise.resolve();
		});

		await expect(
			queue.drain({ baseUrl, label: 'images', request: recorder.request }),
		).rejects.toThrow('rate limited');
		expect(recorder.bodies).toHaveLength(2);
		expect(await readQueuedCount()).toBe(150);
	});

	test('a dry run calls nothing and keeps the queue', async () => {
		const { queue } = await queueNames(5);
		const recorder = createRecorder();

		await queue.drain({ baseUrl, dryRun: true, label: 'images', request: recorder.request });

		expect(recorder.bodies).toEqual([]);
		expect(await readQueuedCount()).toBe(5);
	});

	test('a relative base URL refuses before any call', async () => {
		const { queue } = await queueNames(5);
		const recorder = createRecorder();

		await expect(
			queue.drain({ baseUrl: '/media', label: 'images', request: recorder.request }),
		).rejects.toThrow('must be absolute');
		expect(recorder.bodies).toEqual([]);
		expect(await readQueuedCount()).toBe(5);
	});
});
