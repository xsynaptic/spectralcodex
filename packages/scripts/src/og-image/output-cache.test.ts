import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createOutputCache, getOutputCacheKey } from '#og-image/output-cache.ts';

describe('getOutputCacheKey', () => {
	const base = { digest: 'digest', imageDigest: 'source-a', imageId: 'image/entry.jpg' };

	test('changes when the source image is edited, so a retouched photo regenerates its cards', () => {
		expect(getOutputCacheKey({ ...base, imageDigest: 'source-b' })).not.toBe(
			getOutputCacheKey(base),
		);
	});

	test('changes when the entry content changes', () => {
		expect(getOutputCacheKey({ ...base, digest: 'other' })).not.toBe(getOutputCacheKey(base));
	});

	test('stays stable when the source image is missing', () => {
		const key = getOutputCacheKey({ ...base, imageDigest: undefined });

		expect(key).toBe(getOutputCacheKey({ ...base, imageDigest: undefined }));
		expect(key).not.toBe(getOutputCacheKey(base));
	});
});

describe('createOutputCache', () => {
	let directory: string;
	let statePath: string;

	function open() {
		return createOutputCache({ directory, statePath });
	}

	beforeEach(() => {
		directory = mkdtempSync(path.join(tmpdir(), 'og-output-cache-'));
		statePath = mkdtempSync(path.join(tmpdir(), 'og-output-state-'));
	});

	afterEach(() => {
		rmSync(directory, { force: true, recursive: true });
		rmSync(statePath, { force: true, recursive: true });
	});

	test('a recorded key without its file is stale, so a cleared directory redraws', async () => {
		const cache = await open();

		await cache.write('a-post', 'key', new TextEncoder().encode('card'));

		expect(cache.isFresh('a-post', 'key')).toBe(true);

		rmSync(path.join(directory, 'a-post.jpg'));

		expect(cache.isFresh('a-post', 'key')).toBe(false);
	});

	test('freshness survives a new run through the sidecar', async () => {
		const first = await open();

		await first.write('a-post', 'key', new TextEncoder().encode('card'));
		await first.save();

		const second = await open();

		expect(second.isFresh('a-post', 'key')).toBe(true);
	});

	test('prune drops cards and keys the built set no longer asks for', async () => {
		const cache = await open();

		await cache.write('a-post', 'key', new TextEncoder().encode('card'));
		await cache.write('an-orphan', 'key', new TextEncoder().encode('card'));
		writeFileSync(path.join(directory, 'never-recorded.jpg'), 'card');

		const prune = await cache.planPrune(new Set(['a-post']));

		expect(prune.orphans).toEqual(['an-orphan.jpg', 'never-recorded.jpg']);

		await prune.apply();
		await cache.save();

		const reopened = await open();

		expect(reopened.isFresh('a-post', 'key')).toBe(true);
		expect(reopened.isFresh('an-orphan', 'key')).toBe(false);
	});

	test('prune refuses an empty set, because a missing dist is not a deletion order', async () => {
		const cache = await open();

		await cache.write('a-post', 'key', new TextEncoder().encode('card'));

		await expect(cache.planPrune(new Set())).rejects.toThrow('nothing references it');
	});

	test('prune refuses to delete most cards at once unless allowed', async () => {
		const cache = await open();

		for (let index = 0; index < 101; index++) {
			writeFileSync(path.join(directory, `stale-${String(index)}.jpg`), 'card');
		}

		await expect(cache.planPrune(new Set(['a-post']))).rejects.toThrow(/Refusing to prune 101/);

		const prune = await cache.planPrune(new Set(['a-post']), { isMassPruneAllowed: true });

		expect(prune.orphans).toHaveLength(101);
	});
});
