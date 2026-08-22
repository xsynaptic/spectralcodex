import { describe, expect, test } from 'vitest';

import type { OpenGraphContentEntry } from './types';

import { batchEntriesBySourceImage, getOutputCacheKey } from './batch';

function makeOgEntry(overrides: Partial<OpenGraphContentEntry> = {}): OpenGraphContentEntry {
	return {
		id: 'entry',
		collection: 'posts',
		digest: 'digest',
		title: 'Title',
		imageFeaturedId: 'image/entry.jpg',
		isFallback: false,
		...overrides,
	};
}

describe('batchEntriesBySourceImage', () => {
	test('separates fallback entries sharing a source image, because only those get blurred', () => {
		const batches = batchEntriesBySourceImage([
			makeOgEntry({ id: 'plain' }),
			makeOgEntry({ id: 'fallback', isFallback: true }),
		]);

		expect(batches).toHaveLength(2);
		expect(new Set(batches.map((batch) => batch.isFallback))).toEqual(new Set([false, true]));
	});

	test('places every entry in exactly one batch', () => {
		const entries = [
			makeOgEntry({ id: 'a' }),
			makeOgEntry({ id: 'b' }),
			makeOgEntry({ id: 'c', imageFeaturedId: 'image/other.jpg' }),
			makeOgEntry({ id: 'd', isFallback: true }),
		];

		const batched = batchEntriesBySourceImage(entries).flatMap((batch) => batch.entries);

		expect(batched.map((entry) => entry.id).toSorted((a, b) => a.localeCompare(b))).toEqual([
			'a',
			'b',
			'c',
			'd',
		]);
	});
});

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
