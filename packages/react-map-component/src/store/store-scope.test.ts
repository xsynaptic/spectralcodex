import type { MapSourceItem } from '@spectralcodex/map-codec';

import { describe, expect, test } from 'vitest';

import type { MapScopeState } from '#store/store-scope.ts';
import type { MapScope, MapView } from '#types.ts';

import { reduceMapScope } from '#store/store-scope.ts';

function makeItem(properties: Partial<MapSourceItem['properties']>) {
	return { properties } as MapSourceItem;
}

// The Region covers ordinals 10 to 19; theme 3 has Locations inside and outside it
const items = [
	makeItem({ id: 'theater', regionOrdinals: [12], themeIndices: [3] }),
	makeItem({ id: 'theater-1', regionOrdinals: [12], themeIndices: [3] }),
	makeItem({ id: 'cinema', regionOrdinals: [40], themeIndices: [3] }),
	makeItem({ id: 'temple', regionOrdinals: [14] }),
	makeItem({ id: 'mine', regionOrdinals: [40] }),
];

const theme: MapScope = {
	rule: { index: 3, type: 'theme' },
	title: 'Theaters',
	url: '/themes/theaters/',
};

const region: MapScope = {
	apiDivisionUrl: '/api/divisions/tainan.fgb',
	rule: { interval: [10, 19], type: 'region' },
	title: 'Tainan',
	url: '/regions/tainan/',
};

const noView: MapView = {};

function locationView(...targetIds: Array<string>): MapView {
	return { targetIds };
}

function getViewKey(view: MapView) {
	return view === noView ? undefined : JSON.stringify(view);
}

const clear = 'clear';

// Applies each view twice, as a `map:sync` on the same page does; `clear` stands for the X on the Scope bar
function browse(steps: Array<MapView | typeof clear>) {
	let state: MapScopeState = { scope: undefined, viewKey: undefined };

	for (const step of steps) {
		if (step === clear) {
			state = { ...state, scope: undefined };
			continue;
		}

		const viewKey = getViewKey(step);

		for (const sync of [1, 2]) {
			const result = reduceMapScope(state, { view: step, viewKey }, items);

			expect(result.isSettled, `sync ${String(sync)}`).toBe(true);
			state = { scope: result.scope, viewKey };
		}
	}

	return state.scope;
}

describe('reduceMapScope', () => {
	test('a Theme sets the Scope', () => {
		expect(browse([{ scope: theme }])).toBe(theme);
	});

	test('a member Location keeps the Scope', () => {
		expect(browse([{ scope: theme }, locationView('theater', 'theater-1')])).toBe(theme);
		expect(browse([{ scope: region }, locationView('temple')])).toBe(region);
	});

	test('a Region reached from a member Location replaces the Theme', () => {
		expect(browse([{ scope: theme }, locationView('theater'), { scope: region }])).toBe(region);
	});

	test('a Location outside the Scope clears it', () => {
		expect(browse([{ scope: region }, locationView('mine')])).toBeUndefined();
		expect(browse([{ scope: theme }, locationView('temple')])).toBeUndefined();
	});

	test('a Location with one Target outside the Scope clears it', () => {
		expect(browse([{ scope: region }, locationView('theater', 'cinema')])).toBeUndefined();
	});

	test('a Location whose Targets are not on the map clears the Scope', () => {
		expect(browse([{ scope: region }, locationView('unmapped')])).toBeUndefined();
		expect(browse([{ scope: region }, locationView()])).toBeUndefined();
	});

	// Passing the same view again stands for a `map:sync` on that page, not a new visit
	test('a cleared Scope stays cleared on the page that set it and on a member Location', () => {
		expect(browse([{ scope: theme }, clear, { scope: theme }])).toBeUndefined();
		expect(browse([{ scope: theme }, clear, locationView('theater')])).toBeUndefined();
	});

	test('a cleared Scope is set again by the next visit to its page', () => {
		expect(browse([{ scope: theme }, clear, locationView('theater'), { scope: theme }])).toBe(
			theme,
		);
		expect(browse([{ scope: theme }, clear, noView, { scope: theme }])).toBe(theme);
	});

	test('a page with no view leaves the Scope untouched', () => {
		expect(browse([{ scope: theme }, noView, noView])).toBe(theme);
		expect(browse([noView])).toBeUndefined();
	});

	test('a Location view before source data waits, then decides once the data lands', () => {
		const state = { scope: region, viewKey: getViewKey({ scope: region }) };
		const view = locationView('mine');
		const page = { view, viewKey: getViewKey(view) };

		expect(reduceMapScope(state, page, undefined)).toEqual({ isSettled: false, scope: region });
		expect(reduceMapScope(state, page, items)).toEqual({ isSettled: true, scope: undefined });
	});

	test('a view that sets a Scope, or finds none in force, never waits on source data', () => {
		const view = locationView('mine');

		expect(
			reduceMapScope(
				{ scope: theme, viewKey: 'theme' },
				{ view: { scope: region }, viewKey: 'region' },
				undefined,
			),
		).toEqual({ isSettled: true, scope: region });
		expect(
			reduceMapScope(
				{ scope: undefined, viewKey: 'theme' },
				{ view, viewKey: getViewKey(view) },
				undefined,
			),
		).toEqual({ isSettled: true, scope: undefined });
	});
});
