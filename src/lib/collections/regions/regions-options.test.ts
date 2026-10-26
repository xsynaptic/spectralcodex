import { describe, expect, test } from 'vitest';

import { getRegionsOptions } from '#lib/collections/regions/regions-options.ts';

describe('getRegionsOptions', () => {
	test('a country is labelled apart from the regions below it; depths past the second share the third-level labels', () => {
		const third = getRegionsOptions(3);

		expect(getRegionsOptions(1)).not.toStrictEqual(getRegionsOptions(2));
		expect(getRegionsOptions(4)).toStrictEqual(third);
		expect(getRegionsOptions(99)).toStrictEqual(third);
	});
});
