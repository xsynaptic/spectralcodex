import { describe, expect, test } from 'vitest';

import { getAtlasLayout } from '#lib/atlas/atlas-layout-factory.ts';

describe('getAtlasLayout', () => {
	test('every page is regular before the mode is enabled', () => {
		expect(getAtlasLayout({ hasFlag: false, isPaneMatch: true, page: 'map' })).toBe('regular');
		expect(getAtlasLayout({ hasFlag: false, isPaneMatch: true, page: 'pane' })).toBe('regular');
	});

	test('the full-screen map shows at every width', () => {
		expect(getAtlasLayout({ hasFlag: true, isPaneMatch: false, page: 'map' })).toBe('map');
		expect(getAtlasLayout({ hasFlag: true, isPaneMatch: true, page: 'map' })).toBe('map');
	});

	test('a pane page too narrow for the split covers the map as a sheet', () => {
		expect(getAtlasLayout({ hasFlag: true, isPaneMatch: false, page: 'pane' })).toBe('sheet');
	});

	test('a pane page splits once the split fits', () => {
		expect(getAtlasLayout({ hasFlag: true, isPaneMatch: true, page: 'pane' })).toBe('split');
	});

	test('a page that is not an atlas page stays regular at any width', () => {
		expect(getAtlasLayout({ hasFlag: true, isPaneMatch: false, page: undefined })).toBe('regular');
		expect(getAtlasLayout({ hasFlag: true, isPaneMatch: true, page: undefined })).toBe('regular');
	});
});
