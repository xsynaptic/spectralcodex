import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createOutputCache, getOutputCacheKey } from '#og-image/output-cache.ts';

describe('getOutputCacheKey', () => {
	const base = { digest: 'digest', imageId: 'image/entry.jpg', imageModifiedTime: 1000 };

	test('changes when the source image is edited, so a retouched photo regenerates its cards', () => {
		expect(getOutputCacheKey({ ...base, imageModifiedTime: 2000 })).not.toBe(
			getOutputCacheKey(base),
		);
	});

	test('changes when the entry content changes', () => {
		expect(getOutputCacheKey({ ...base, digest: 'other' })).not.toBe(getOutputCacheKey(base));
	});

	test('stays stable when the source image has no modified time', () => {
		const key = getOutputCacheKey({ ...base, imageModifiedTime: undefined });

		expect(key).toBe(getOutputCacheKey({ ...base, imageModifiedTime: undefined }));
		expect(key).not.toBe(getOutputCacheKey(base));
	});
});

describe('createOutputCache', () => {
	let directory: string;

	function writeCard(id: string) {
		writeFileSync(path.join(directory, `${id}.jpg`), 'card');
	}

	function readManifest(): Record<string, string> {
		return JSON.parse(readFileSync(path.join(directory, 'manifest.json'), 'utf8')) as Record<
			string,
			string
		>;
	}

	beforeEach(() => {
		directory = mkdtempSync(path.join(tmpdir(), 'og-output-cache-'));
	});

	afterEach(() => {
		rmSync(directory, { force: true, recursive: true });
	});

	test('a recorded key without its file is stale, so a cleared directory redraws', async () => {
		const cache = await createOutputCache(directory);

		await cache.write('a-post', 'key', new TextEncoder().encode('card'));

		expect(cache.isFresh('a-post', 'key')).toBe(true);

		rmSync(path.join(directory, 'a-post.jpg'));

		expect(cache.isFresh('a-post', 'key')).toBe(false);
	});

	test('freshness survives a new run through the manifest', async () => {
		const first = await createOutputCache(directory);

		await first.write('a-post', 'key', new TextEncoder().encode('card'));
		await first.save();

		const second = await createOutputCache(directory);

		expect(second.isFresh('a-post', 'key')).toBe(true);
	});

	test('prune drops cards and keys the built set no longer asks for', async () => {
		const cache = await createOutputCache(directory);

		await cache.write('a-post', 'key', new TextEncoder().encode('card'));
		await cache.write('an-orphan', 'key', new TextEncoder().encode('card'));
		writeCard('never-recorded');

		expect(await cache.prune(new Set(['a-post']))).toBe(2);

		await cache.save();

		expect(Object.keys(readManifest())).toEqual(['a-post']);
	});

	test('prune refuses an empty set, because a missing dist is not a deletion order', async () => {
		const cache = await createOutputCache(directory);

		await cache.write('a-post', 'key', new TextEncoder().encode('card'));

		expect(await cache.prune(new Set())).toBe(0);

		await cache.save();

		expect(Object.keys(readManifest())).toEqual(['a-post']);
	});
});
