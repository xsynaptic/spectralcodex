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
	test.each<[string, Parameters<typeof isLinkUrlMatch>[1], boolean]>([
		['https://www.taipeitimes.com/News/feat/12345', 'taipeitimes.com', true],
		['https://nchdb.boch.gov.tw/assets/overview/123', ['bunka.go.jp', 'boch.gov.tw'], true],
		['https://example.com', undefined, false],
	])('%s against %j matches: %s', (linkUrl, matchPattern, isMatch) => {
		expect(isLinkUrlMatch(linkUrl, matchPattern)).toBe(isMatch);
	});
});
