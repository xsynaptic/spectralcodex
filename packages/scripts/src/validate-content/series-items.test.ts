import { describe, expect, test } from 'vitest';

import { validateSeriesItems } from '#validate-content/series-items.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const validTargets = [
	makeEntry({ id: 'a-location' }),
	makeEntry({ id: 'a-post', collection: 'posts' }),
];

describe('validateSeriesItems', () => {
	test('passes when every item names a known entry across collections', () => {
		const entries = [
			makeEntry({
				id: 'a-series',
				collection: 'series',
				data: { seriesItems: ['a-location', 'a-post'] },
			}),
		];

		expect(validateSeriesItems(entries, validTargets)).toEqual({
			status: 'pass',
			summary: 'Series items valid',
			issues: [],
		});
	});

	test('flags an unknown item, naming the file', () => {
		const entries = [
			makeEntry({
				id: 'a-series',
				collection: 'series',
				filePath: 'series/a-series.mdx',
				data: { seriesItems: ['a-location', 'vanished'] },
			}),
		];

		expect(validateSeriesItems(entries, validTargets)).toEqual({
			status: 'fail',
			summary: 'Found 1 unknown series item(s)',
			issues: [{ message: 'series/a-series.mdx: unknown series item "vanished"' }],
		});
	});
});
