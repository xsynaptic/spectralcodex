import { describe, expect, test } from 'vitest';

import { getLinkPlatform } from '#lib/utils/link-platforms.ts';

describe('getLinkPlatform', () => {
	test('an alias domain resolves to the same platform as the main one', () => {
		expect(getLinkPlatform('https://youtu.be/abc')).toBe('YouTube');
		expect(getLinkPlatform('https://www.youtube.com/watch?v=abc')).toBe('YouTube');
	});

	test('subdomains and bare hosts resolve alongside canonical URLs', () => {
		expect(getLinkPlatform('https://m.facebook.com/story.php?id=1')).toBe('Facebook');
		expect(getLinkPlatform('https://facebook.com')).toBe('Facebook');
	});

	test('a platform with a Chinese title still reports the English one', () => {
		expect(getLinkPlatform('https://vocus.cc/article/abc')).toBe('Vocus');
	});

	test('an unlisted host is unlabelled rather than guessed', () => {
		expect(getLinkPlatform('https://en.wikipedia.org/wiki/Taiwan')).toBeUndefined();
	});
});
