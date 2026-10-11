import type { CollectionEntry, CollectionKey } from 'astro:content';

import { createSqliteCache } from '@spectralcodex/shared/cache';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';

import { createWordCountFunction } from '#lib/catalog/catalog-word-count.ts';

function buildEntry(id: string, body: string) {
	return { body, collection: 'posts', data: {}, id } as unknown as CollectionEntry<CollectionKey>;
}

function setup() {
	const cache = createSqliteCache<number>(
		mkdtempSync(path.join(tmpdir(), 'word-count-cache-')),
		'word-counts',
	);
	const setSpy = vi.spyOn(cache, 'set');

	return { getWordCount: createWordCountFunction({ cache }), setSpy };
}

describe('createWordCountFunction', () => {
	test('serves a repeat call from the cache', () => {
		const { getWordCount, setSpy } = setup();
		const entry = buildEntry('alpha', 'One two three.');

		expect(getWordCount(entry)).toBe(3);
		expect(getWordCount(entry)).toBe(3);
		expect(setSpy).toHaveBeenCalledTimes(1);
	});

	test('changed body invalidates the cached count', () => {
		const { getWordCount, setSpy } = setup();

		getWordCount(buildEntry('alpha', 'One two three.'));

		expect(getWordCount(buildEntry('alpha', 'One two three four.'))).toBe(4);
		expect(setSpy).toHaveBeenCalledTimes(2);
	});
});
