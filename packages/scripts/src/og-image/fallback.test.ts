import { describe, expect, test } from 'vitest';

import {
	fallbackImageIds,
	getFallbackImageId,
	resolveFallbackImageId,
} from '#og-image/fallback.ts';

function optionsFor(key: string): Array<string> {
	const value = fallbackImageIds[key];

	if (value === undefined) throw new Error(`No fallback images for key "${key}"`);

	return typeof value === 'string' ? [value] : [...value];
}

describe('getFallbackImageId priority chain', () => {
	const id = 'some-entry';

	test('the resources collection wins over a matching theme', () => {
		const withTheme = getFallbackImageId({
			collection: 'resources',
			id,
			themes: ['taiwan-theaters'],
		});

		expect(optionsFor('resources')).toContain(withTheme);
		expect(optionsFor('taiwan-theaters')).not.toContain(withTheme);
	});

	test('a theme wins over the region', () => {
		const withTheme = getFallbackImageId({
			collection: 'locations',
			id,
			regions: ['taiwan', 'tainan'],
			themes: ['taiwan-railways'],
		});

		expect(withTheme).toBe(fallbackImageIds['taiwan-railways']);
		expect(withTheme).not.toBe(fallbackImageIds['taiwan/tainan']);
	});

	test('a niche theme wins over a broad one, whatever order they are listed in', () => {
		const themes = ['taiwan-urban-exploration', 'taiwan-theaters'];

		const chosen = getFallbackImageId({ collection: 'locations', id, themes });
		const reversed = getFallbackImageId({
			collection: 'locations',
			id,
			themes: themes.toReversed(),
		});

		expect(optionsFor('taiwan-theaters')).toContain(chosen);
		expect(optionsFor('taiwan-urban-exploration')).not.toContain(chosen);
		expect(reversed).toBe(chosen);
	});

	test('a Taiwan region with a parent of its own gets the parent key', () => {
		const chosen = getFallbackImageId({
			collection: 'locations',
			id,
			regions: ['taiwan', 'tainan'],
		});

		expect(chosen).toBe(fallbackImageIds['taiwan/tainan']);
	});

	test('a Taiwan region with an unknown parent falls back to the Taiwan key', () => {
		const chosen = getFallbackImageId({
			collection: 'locations',
			id,
			regions: ['taiwan', 'atlantis'],
		});

		expect(chosen).toBe(fallbackImageIds.taiwan);
	});

	test('a Taiwan region with no parent at all falls back to the Taiwan key', () => {
		expect(getFallbackImageId({ collection: 'locations', id, regions: ['taiwan'] })).toBe(
			fallbackImageIds.taiwan,
		);
	});

	test('a temple outside Taiwan gets the temple key, not its region', () => {
		const chosen = getFallbackImageId({
			category: 'temple',
			collection: 'locations',
			id,
			regions: ['japan'],
		});

		expect(chosen).toBe(fallbackImageIds.temple);
		expect(chosen).not.toBe(fallbackImageIds.japan);
	});

	test('a temple inside Taiwan keeps the Taiwan region key', () => {
		const chosen = getFallbackImageId({
			category: 'temple',
			collection: 'locations',
			id,
			regions: ['taiwan', 'tainan'],
		});

		expect(chosen).toBe(fallbackImageIds['taiwan/tainan']);
		expect(chosen).not.toBe(fallbackImageIds.temple);
	});

	test('a known non-Taiwan ancestor resolves to itself', () => {
		expect(getFallbackImageId({ collection: 'locations', id, regions: ['japan'] })).toBe(
			fallbackImageIds.japan,
		);
	});

	test('an unknown ancestor with no other signal falls through to the default pool', () => {
		const chosen = getFallbackImageId({ collection: 'posts', id, regions: ['atlantis'] });

		expect(optionsFor('default')).toContain(chosen);
	});

	test('nothing at all falls through to the default pool', () => {
		expect(optionsFor('default')).toContain(getFallbackImageId({ collection: 'posts', id }));
	});
});

describe('resolveFallbackImageId', () => {
	const manyIds = Array.from({ length: 64 }, (_, index) => `entry-${String(index)}`);

	test('a string-valued key returns that string for any id', () => {
		expect(resolveFallbackImageId('japan', 'a')).toBe(fallbackImageIds.japan);
		expect(resolveFallbackImageId('japan', 'zzzzzzzz')).toBe(fallbackImageIds.japan);
	});

	test('an unknown key falls back to the default pool', () => {
		const chosen = resolveFallbackImageId('no-such-key', 'a');

		expect(optionsFor('default')).toContain(chosen);
	});

	test('an array-valued key always resolves to one of its options', () => {
		const options = optionsFor('taiwan-theaters');

		for (const id of manyIds) {
			expect(options).toContain(resolveFallbackImageId('taiwan-theaters', id));
		}
	});

	test('a spread of ids reaches more than one option', () => {
		const chosen = new Set(manyIds.map((id) => resolveFallbackImageId('default', id)));

		expect(chosen.size).toBeGreaterThan(1);
	});

	test('the empty id still resolves to an option', () => {
		expect(optionsFor('default')).toContain(resolveFallbackImageId('default', ''));
	});
});
