import { describe, expect, test } from 'vitest';

import { validateSeriesItems } from '#validate-content/series-items.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const validTargets = [
	makeEntry({ id: 'a-location' }),
	makeEntry({ collection: 'posts', id: 'a-post' }),
];

describe('validateSeriesItems', () => {
	test('passes when every item names a known entry across collections', () => {
		const entries = [
			makeEntry({
				collection: 'series',
				data: { seriesItems: ['a-location', 'a-post'] },
				id: 'a-series',
			}),
		];

		expect(validateSeriesItems(entries, validTargets)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'Series items valid',
		});
	});

	test('flags an unknown item, naming the file', () => {
		const entries = [
			makeEntry({
				collection: 'series',
				data: { seriesItems: ['a-location', 'vanished'] },
				filePath: 'series/a-series.mdx',
				id: 'a-series',
			}),
		];

		expect(validateSeriesItems(entries, validTargets)).toEqual({
			issues: [{ message: 'series/a-series.mdx: unknown series item "vanished"' }],
			status: 'fail',
			summary: 'Found 1 unknown series item(s)',
		});
	});
});
