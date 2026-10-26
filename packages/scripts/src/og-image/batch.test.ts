import { describe, expect, test } from 'vitest';

import { batchEntriesBySourceImage } from '#og-image/batch.ts';
import { makeOgEntry } from '#og-image/og-image-test-utils.ts';

describe('batchEntriesBySourceImage', () => {
	test('shares a batch per source image, separating fallback entries because only those get blurred', () => {
		const batches = batchEntriesBySourceImage([
			makeOgEntry({ id: 'a' }),
			makeOgEntry({ id: 'b' }),
			makeOgEntry({ id: 'c', imageFeaturedId: 'image/other.jpg' }),
			makeOgEntry({ id: 'd', isFallback: true }),
		]);
		const batched = batches.flatMap((batch) => batch.entries);

		expect(batches).toHaveLength(3);
		expect(new Set(batches.map((batch) => batch.isFallback))).toEqual(new Set([false, true]));
		expect(batched.map((entry) => entry.id).toSorted((idA, idB) => idA.localeCompare(idB))).toEqual(
			['a', 'b', 'c', 'd'],
		);
	});
});
