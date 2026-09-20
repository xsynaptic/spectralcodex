import { describe, expect, test } from 'vitest';

import { batchEntriesBySourceImage } from '#og-image/batch.ts';
import { makeOgEntry } from '#og-image/og-image-test-utils.ts';

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
