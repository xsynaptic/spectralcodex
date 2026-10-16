import { describe, expect, test } from 'vitest';

import { getAtlasOpenAction } from '#lib/atlas/atlas-layout-factory.ts';

const pathname = '/some-location/';

describe('getAtlasOpenAction', () => {
	test('the page already open scrolls a half Sheet to where it starts', () => {
		expect(
			getAtlasOpenAction({ pathname, screen: { layout: 'sheet', rest: 'half' }, url: pathname }),
		).toEqual({ type: 'start' });
	});

	test('the page already open scrolls to its top with the Pane in view', () => {
		for (const screen of [{ layout: 'split' }, { layout: 'sheet', rest: 'raised' }] as const) {
			expect(getAtlasOpenAction({ pathname, screen, url: pathname })).toEqual({ type: 'top' });
		}
	});
});
