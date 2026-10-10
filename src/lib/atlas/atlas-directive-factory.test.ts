import { describe, expect, test } from 'vitest';

import { shouldHydrateAtlas } from '#lib/atlas/atlas-directive-factory.ts';

describe('shouldHydrateAtlas', () => {
	test('nothing hydrates before the mode is enabled', () => {
		expect(shouldHydrateAtlas({ hasFlag: false, isPaneMatch: true, page: 'map' })).toBe(false);
		expect(shouldHydrateAtlas({ hasFlag: false, isPaneMatch: true, page: 'pane' })).toBe(false);
	});

	test('the full-screen map hydrates at every width', () => {
		expect(shouldHydrateAtlas({ hasFlag: true, isPaneMatch: false, page: 'map' })).toBe(true);
	});

	test('a pane page too narrow for the split starts no map', () => {
		expect(shouldHydrateAtlas({ hasFlag: true, isPaneMatch: false, page: 'pane' })).toBe(false);
	});

	test('a pane page hydrates once the split fits', () => {
		expect(shouldHydrateAtlas({ hasFlag: true, isPaneMatch: true, page: 'pane' })).toBe(true);
	});

	test('a persisted shell on a regular page starts no map at any width', () => {
		expect(shouldHydrateAtlas({ hasFlag: true, isPaneMatch: false, page: undefined })).toBe(false);
		expect(shouldHydrateAtlas({ hasFlag: true, isPaneMatch: true, page: undefined })).toBe(false);
	});
});
