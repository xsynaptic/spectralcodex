import { describe, expect, test, vi } from 'vitest';

import { checkImageAspectRatios, collectAspectRatioIssues } from './image-aspect-ratios';
import { makeEntry, noop } from './validate-test-utils';

function makeImage(id: string, width: number, height: number) {
	return makeEntry({ id, data: { width, height } });
}

describe('collectAspectRatioIssues', () => {
	test.each([
		{ label: '4:3', width: 1600, height: 1200 },
		{ label: '3:4', width: 1200, height: 1600 },
		{ label: '3:2', width: 1800, height: 1200 },
		{ label: '2:3', width: 1200, height: 1800 },
		{ label: '1:1', width: 1200, height: 1200 },
	])('accepts the canonical $label ratio', ({ label, width, height }) => {
		const result = collectAspectRatioIssues([makeImage(`photo-${label}`, width, height)]);

		expect(result.flagged).toEqual([]);
		expect(result.checkedCount).toBe(1);
	});

	test('accepts a ratio within the tolerance', () => {
		// 1204/900 = 1.3378, delta from 4:3 is ~0.0044
		const result = collectAspectRatioIssues([makeImage('near-canonical', 1204, 900)]);

		expect(result.flagged).toEqual([]);
	});

	test('flags a ratio outside the tolerance with the nearest canonical label', () => {
		// 1215/900 = 1.35, delta from 4:3 is ~0.0167
		const result = collectAspectRatioIssues([makeImage('off-ratio', 1215, 900)]);

		expect(result.flagged).toHaveLength(1);
		expect(result.flagged[0]).toMatchObject({ id: 'off-ratio', nearest: '4:3' });
	});

	test('exempts the errata prefix', () => {
		const result = collectAspectRatioIssues([makeImage('errata/screenshot', 1215, 900)]);

		expect(result.flagged).toEqual([]);
		expect(result.checkedCount).toBe(0);
	});

	test('skips entries with missing or non-positive dimensions', () => {
		const result = collectAspectRatioIssues([
			makeEntry({ id: 'no-dimensions' }),
			makeEntry({ id: 'zero-width', data: { width: 0, height: 900 } }),
		]);

		expect(result.flagged).toEqual([]);
		expect(result.checkedCount).toBe(0);
	});

	test('sorts flagged images by id', () => {
		const result = collectAspectRatioIssues([
			makeImage('zebra', 1215, 900),
			makeImage('aardvark', 1215, 900),
		]);

		expect(result.flagged.map((item) => item.id)).toEqual(['aardvark', 'zebra']);
	});
});

describe('checkImageAspectRatios', () => {
	test('returns true when all ratios are canonical and false otherwise', () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(noop);

		expect(checkImageAspectRatios([makeImage('good', 1600, 1200)])).toBe(true);
		expect(checkImageAspectRatios([makeImage('bad', 1215, 900)])).toBe(false);

		logSpy.mockRestore();
	});
});
