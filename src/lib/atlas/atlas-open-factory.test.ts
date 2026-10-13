import { describe, expect, test } from 'vitest';

import { getAtlasOpenAction } from '#lib/atlas/atlas-open-factory.ts';

const pathname = '/some-location/';

describe('getAtlasOpenAction', () => {
	test('another page is navigated to under a lowered Sheet', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: '/other/' }, pathname, sheet: 'down' }),
		).toEqual({ type: 'navigate', url: '/other/' });
	});

	test('another page is navigated to with the Pane in view', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: '/other/' }, pathname, sheet: 'raised' }),
		).toEqual({ type: 'navigate', url: '/other/' });
	});

	test('the page already open raises a lowered Sheet', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: pathname }, pathname, sheet: 'down' }),
		).toEqual({ type: 'raise' });
	});

	test('the page already open scrolls to its top with the Pane in view', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: pathname }, pathname, sheet: 'raised' }),
		).toEqual({ type: 'top' });
	});

	test('a Target with no popup raises a lowered Sheet', () => {
		expect(
			getAtlasOpenAction({ intent: { hasPopup: false, kind: 'target' }, pathname, sheet: 'down' }),
		).toEqual({ type: 'raise' });
	});

	test('a Target with no popup scrolls the page to its top with the Pane in view', () => {
		expect(
			getAtlasOpenAction({
				intent: { hasPopup: false, kind: 'target' },
				pathname,
				sheet: 'raised',
			}),
		).toEqual({ type: 'top' });
	});

	test('a Target with a popup raises a lowered Sheet, so no popup opens behind it', () => {
		expect(
			getAtlasOpenAction({ intent: { hasPopup: true, kind: 'target' }, pathname, sheet: 'down' }),
		).toEqual({ type: 'raise' });
	});

	test('a Target with a popup is declined with the Pane in view', () => {
		expect(
			getAtlasOpenAction({ intent: { hasPopup: true, kind: 'target' }, pathname, sheet: 'raised' }),
		).toEqual({ type: 'none' });
	});
});
