import { describe, expect, test } from 'vitest';

import { formatImageName, getImageStem, parseImageName } from '#image-name.ts';

describe('parseImageName', () => {
	test.each([
		{ format: 'jpg', stem: 'taiwan/taipei/some-image-1', width: 1200 },
		{ format: 'webp', height: 800, stem: 'taiwan/taipei/some-image-1', width: 1200 },
		{ format: 'webp', height: 233, stem: 'taiwan/taipei/some-image-1', width: 350 },
		{ format: 'jpg', height: 514, stem: 'taiwan/taipei/some-image-1', width: 771 },
		{ format: 'webp', height: 48, stem: 'errata/2016/01/a-b-2', width: 64 },
	] as const)('round-trips $stem at $width', (name) => {
		expect(parseImageName(formatImageName(name))).toStrictEqual(name);
	});

	test('a stem ending in digits keeps them, since only the last segment is the size', () => {
		expect(parseImageName('a/b-1-450.jpg')).toStrictEqual({
			format: 'jpg',
			stem: 'a/b-1',
			width: 450,
		});
	});

	test.each([
		['a missing size', 'a/b.jpg'],
		['a zero width', 'a/b-0.jpg'],
		['a zero height', 'a/b-450x0.webp'],
		['an unknown format', 'a/b-450.png'],
		['a `..` segment', '../media/a/b-450.jpg'],
		['an empty segment', '/a/b-450.jpg'],
	])('rejects %s', (_label, name) => {
		expect(parseImageName(name)).toBeUndefined();
	});
});

describe('getImageStem', () => {
	test('drops only the extension of the last segment', () => {
		expect(getImageStem('2007/vancouver.2007/x-1.jpg')).toBe('2007/vancouver.2007/x-1');
	});
});
