import { describe, expect, test } from 'vitest';

import { getAtlasOpenAction } from '#lib/atlas/atlas-open-factory.ts';

const pathname = '/some-location/';

const split = { layout: 'split' } as const;
const raised = { layout: 'sheet', rest: 'raised' } as const;
const half = { layout: 'sheet', rest: 'half' } as const;
const down = { layout: 'sheet', rest: 'down' } as const;

describe('getAtlasOpenAction', () => {
	test('another page is navigated to under a lowered Sheet', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: '/other/' }, pathname, screen: down }),
		).toEqual({ type: 'navigate', url: '/other/' });
	});

	test('another page is navigated to with the Pane in view', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: '/other/' }, pathname, screen: split }),
		).toEqual({ type: 'navigate', url: '/other/' });
	});

	test('the page already open raises a lowered Sheet', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: pathname }, pathname, screen: down }),
		).toEqual({ type: 'raise' });
	});

	test('the page already open scrolls to its top with the Pane in view', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: pathname }, pathname, screen: split }),
		).toEqual({ type: 'top' });
	});

	test('a Target with no popup raises a lowered Sheet', () => {
		expect(
			getAtlasOpenAction({ intent: { hasPopup: false, kind: 'target' }, pathname, screen: down }),
		).toEqual({ type: 'raise' });
	});

	test('a Target with no popup scrolls the page to its top with the Pane in view', () => {
		expect(
			getAtlasOpenAction({
				intent: { hasPopup: false, kind: 'target' },
				pathname,
				screen: split,
			}),
		).toEqual({ type: 'top' });
	});

	test('a Target with a popup raises a lowered Sheet, so no popup opens behind it', () => {
		expect(
			getAtlasOpenAction({ intent: { hasPopup: true, kind: 'target' }, pathname, screen: down }),
		).toEqual({ type: 'raise' });
	});

	test('a half Sheet takes every click on its own page and scrolls to where it starts', () => {
		for (const intent of [
			{ kind: 'open', url: pathname },
			{ hasPopup: false, kind: 'target' },
			{ hasPopup: true, kind: 'target' },
		] as const) {
			expect(getAtlasOpenAction({ intent, pathname, screen: half })).toEqual({ type: 'start' });
		}
	});

	test('another page is navigated to from a half Sheet', () => {
		expect(
			getAtlasOpenAction({ intent: { kind: 'open', url: '/other/' }, pathname, screen: half }),
		).toEqual({ type: 'navigate', url: '/other/' });
	});

	test('a Target with a popup is declined with the Pane in view', () => {
		expect(
			getAtlasOpenAction({ intent: { hasPopup: true, kind: 'target' }, pathname, screen: split }),
		).toEqual({ type: 'none' });
	});

	test('a raised Sheet answers as the Split does', () => {
		for (const intent of [
			{ kind: 'open', url: pathname },
			{ hasPopup: false, kind: 'target' },
			{ hasPopup: true, kind: 'target' },
		] as const) {
			expect(getAtlasOpenAction({ intent, pathname, screen: raised })).toEqual(
				getAtlasOpenAction({ intent, pathname, screen: split }),
			);
		}
	});
});
