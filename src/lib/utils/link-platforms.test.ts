import { describe, expect, test } from 'vitest';

import { getLinkPlatform } from '#lib/utils/link-platforms.ts';

describe('getLinkPlatform', () => {
	test.each([
		['https://youtu.be/abc', 'YouTube'],
		['https://www.youtube.com/watch?v=abc', 'YouTube'],
		['https://m.facebook.com/story.php?id=1', 'Facebook'],
		['https://facebook.com', 'Facebook'],
	])('%s resolves to %s', (url, expected) => {
		expect(getLinkPlatform(url)).toBe(expected);
	});

	test.each([
		'https://en.wikipedia.org/wiki/Taiwan',
		'https://spectralcodex.com/posts/abc',
		'https://www.e-flux.com/journal/abc',
		'https://kaokao12.nidbox.com/p/1',
	])('%s is unlabelled', (url) => {
		expect(getLinkPlatform(url)).toBeUndefined();
	});
});
