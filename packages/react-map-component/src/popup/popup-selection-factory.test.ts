import { describe, expect, test } from 'vitest';

import type { MapSelectionInput } from '#popup/popup-selection-factory.ts';

import { getSelectionOutcome, getSettledClick } from '#popup/popup-selection-factory.ts';

describe('getSelectionOutcome', () => {
	const hosted: MapSelectionInput = {
		isHosted: true,
		isLoading: false,
		isTarget: false,
		targetCount: 0,
		url: '/some-location/',
	};

	test('a map with no host always opens a popup', () => {
		expect(getSelectionOutcome({ ...hosted, isHosted: false })).toBe('popup');
		expect(getSelectionOutcome({ ...hosted, isHosted: false, isLoading: true })).toBe('popup');
		expect(getSelectionOutcome({ ...hosted, isHosted: false, url: undefined })).toBe('popup');
	});

	test('a hosted map opens the page of a Feature that has one', () => {
		expect(getSelectionOutcome(hosted)).toBe('open');
	});

	test('a hosted map decides nothing while the url is still loading', () => {
		expect(getSelectionOutcome({ ...hosted, isLoading: true, url: undefined })).toBe('pending');
		expect(getSelectionOutcome({ ...hosted, isLoading: true })).toBe('pending');
	});

	test('a hosted Feature with no page falls back to its popup once loaded', () => {
		expect(getSelectionOutcome({ ...hosted, url: undefined })).toBe('popup');
	});

	test('a Target opens its own popup when the Location has several, and nothing when it is the only one', () => {
		const target = { ...hosted, isTarget: true, targetCount: 2 };

		expect(getSelectionOutcome(target)).toBe('popup');
		expect(getSelectionOutcome({ ...target, isLoading: true, url: undefined })).toBe('popup');
		expect(getSelectionOutcome({ ...target, isHosted: false })).toBe('popup');

		expect(getSelectionOutcome({ ...target, targetCount: 1 })).toBe('none');
		expect(getSelectionOutcome({ ...target, isHosted: false, targetCount: 1 })).toBe('none');
	});
});

describe('getSettledClick', () => {
	const click = { clickedId: 'a', isLoading: false, selectedId: 'a' };

	test('a click waits for the popup data before it settles', () => {
		expect(getSettledClick({ ...click, isLoading: true, outcome: 'pending' })).toBeUndefined();
		expect(getSettledClick({ ...click, isLoading: true, outcome: 'popup' })).toBeUndefined();
	});

	test('a click settles as the outcome of the Feature it was made on', () => {
		expect(getSettledClick({ ...click, outcome: 'open' })).toBe('open');
		expect(getSettledClick({ ...click, outcome: 'popup' })).toBe('popup');
	});

	test('a selection nobody clicked opens nothing, whatever its outcome becomes', () => {
		expect(getSettledClick({ ...click, clickedId: undefined, outcome: 'open' })).toBeUndefined();
	});

	test('a click on one Feature never opens another', () => {
		expect(getSettledClick({ ...click, clickedId: 'b', outcome: 'open' })).toBeUndefined();
	});

	test('a click with no selection left settles nothing', () => {
		expect(
			getSettledClick({ ...click, outcome: undefined, selectedId: undefined }),
		).toBeUndefined();
	});

	test('a Target click is spent on its popup, so the same Point opens nothing once it stops being a Target', () => {
		const selection = { isHosted: true, isLoading: false, targetCount: 2, url: '/some-location/' };
		const asTarget = getSelectionOutcome({ ...selection, isTarget: true });
		const afterPageChange = getSelectionOutcome({ ...selection, isTarget: false });

		expect(getSettledClick({ ...click, outcome: asTarget })).toBe('popup');
		expect(afterPageChange).toBe('open');
		expect(
			getSettledClick({ ...click, clickedId: undefined, outcome: afterPageChange }),
		).toBeUndefined();
	});
});
