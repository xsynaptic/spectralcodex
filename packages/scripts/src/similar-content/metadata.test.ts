import { describe, expect, test } from 'vitest';

import { calculateMetadataBoost } from '#similar-content/metadata.ts';

function makeEmbedding(themes: Array<string>, regions: Array<string>) {
	return { metadata: { regions, themes } };
}

describe('calculateMetadataBoost', () => {
	test.each([
		{ expected: 0.15, label: 'one shared theme', other: makeEmbedding(['ruins'], []) },
		{
			expected: 0.25,
			label: 'a shared theme and region',
			other: makeEmbedding(['ruins'], ['taiwan']),
		},
		{ expected: 0, label: 'nothing shared', other: makeEmbedding(['temples'], ['vietnam']) },
	])('$label scores $expected', ({ expected, other }) => {
		expect(calculateMetadataBoost(makeEmbedding(['ruins'], ['taiwan']), other)).toBeCloseTo(
			expected,
		);
	});

	test('four shared themes cap at 0.3', () => {
		const themes = ['ruins', 'temples', 'railways', 'theaters'];
		const current = makeEmbedding(themes, []);
		const other = makeEmbedding(themes, []);

		expect(calculateMetadataBoost(current, other)).toBe(0.3);
	});
});
