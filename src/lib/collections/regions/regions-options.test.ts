import { describe, expect, test } from 'vitest';

import { getRegionsOptions } from '#lib/collections/regions/regions-options.ts';

describe('getRegionsOptions', () => {
	test('every depth resolves both labels and the same related limit', () => {
		for (const depth of [1, 2, 3, 4]) {
			const options = getRegionsOptions(depth);

			expect(options.termsChildrenLabel).toBeTruthy();
			expect(options.termsSiblingsLabel).toBeTruthy();
			expect(options.termsRelatedLimit).toBe(100);
		}
	});

	test('a country is labelled differently from the regions below it', () => {
		expect(getRegionsOptions(1)).not.toStrictEqual(getRegionsOptions(2));
	});

	test('depths past the second share the third-level labels', () => {
		const third = getRegionsOptions(3);

		expect(getRegionsOptions(4)).toStrictEqual(third);
		expect(getRegionsOptions(99)).toStrictEqual(third);
	});

	test('an unplaced region falls through rather than losing its labels', () => {
		expect(getRegionsOptions(0)).toStrictEqual(getRegionsOptions(3));
	});
});
