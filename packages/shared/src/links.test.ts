import { describe, expect, test } from 'vitest';

import { getLinkUrls, isLinkUrlMatch } from '#links.ts';

describe('getLinkUrls', () => {
	test('reads both authored link forms', () => {
		expect(getLinkUrls(['https://example.com/a', { url: 'https://example.com/b' }])).toEqual([
			'https://example.com/a',
			'https://example.com/b',
		]);
	});

	test('returns an empty array when links are absent', () => {
		expect(getLinkUrls(undefined)).toEqual([]);
	});
});

describe('isLinkUrlMatch', () => {
	test('matches a string pattern anywhere in the url', () => {
		expect(isLinkUrlMatch('https://www.taipeitimes.com/News/feat/12345', 'taipeitimes.com')).toBe(
			true,
		);
	});

	test('matches when one pattern of an array hits', () => {
		expect(
			isLinkUrlMatch('https://nchdb.boch.gov.tw/assets/overview/123', [
				'bunka.go.jp',
				'boch.gov.tw',
			]),
		).toBe(true);
	});

	test('does not match an absent pattern or an empty array', () => {
		expect(isLinkUrlMatch('https://example.com', undefined)).toBe(false);
		expect(isLinkUrlMatch('https://example.com', [])).toBe(false);
	});
});
