import { describe, expect, test } from 'vitest';

import { getAtlasExitAction } from '#lib/atlas/atlas-exit-factory.ts';

describe('getAtlasExitAction', () => {
	test('goes back when the tab has an earlier in-site entry, whatever was remembered', () => {
		expect(
			getAtlasExitAction({ canGoBack: true, homePath: '/', returnPath: '/some-location/' }),
		).toEqual({ type: 'back' });
	});

	test('replaces with the remembered page when the map is the first entry', () => {
		expect(
			getAtlasExitAction({ canGoBack: false, homePath: '/', returnPath: '/some-location/' }),
		).toEqual({ path: '/some-location/', type: 'replace' });
	});

	test('replaces with home when nothing was remembered', () => {
		expect(getAtlasExitAction({ canGoBack: false, homePath: '/', returnPath: undefined })).toEqual({
			path: '/',
			type: 'replace',
		});
	});
});
