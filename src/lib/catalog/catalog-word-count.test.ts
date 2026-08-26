import type { CollectionEntry, CollectionKey } from 'astro:content';

import Keyv from 'keyv';
import { describe, expect, test, vi } from 'vitest';

import { createWordCountFunction } from '#lib/catalog/catalog-word-count.ts';

function buildEntry(id: string, body: string) {
	return { id, body, collection: 'posts', data: {} } as unknown as CollectionEntry<CollectionKey>;
}

function setup() {
	const cache = new Keyv();
	const setSpy = vi.spyOn(cache, 'set');

	return { setSpy, getWordCount: createWordCountFunction({ cache }) };
}

describe('createWordCountFunction', () => {
	test('serves a repeat call from the cache', async () => {
		const { getWordCount, setSpy } = setup();
		const entry = buildEntry('alpha', 'One two three.');

		expect(await getWordCount(entry)).toBe(3);
		expect(await getWordCount(entry)).toBe(3);
		expect(setSpy).toHaveBeenCalledTimes(1);
	});

	test('changed body invalidates the cached count', async () => {
		const { getWordCount, setSpy } = setup();

		await getWordCount(buildEntry('alpha', 'One two three.'));

		expect(await getWordCount(buildEntry('alpha', 'One two three four.'))).toBe(4);
		expect(setSpy).toHaveBeenCalledTimes(2);
	});
});
