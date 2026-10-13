import type { MapSourceItem } from '@spectralcodex/map-codec';

import { describe, expect, test } from 'vitest';

import type { MapScope, MapView } from '#types.ts';
import type { MapScopeState } from '#view/view-scope.ts';

import { reduceMapScope } from '#view/view-scope.ts';

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

const off = 'off';
const on = 'on';

// Applies each view twice, as a `map:sync` on the same page does; `off` and `on` stand for the toggle on the Scope bar
function browseHeld(steps: Array<MapView | typeof off | typeof on>) {
	let state: MapScopeState = { isScopeEnabled: true, scope: undefined, viewKey: undefined };

	for (const step of steps) {
		if (step === off || step === on) {
			state = { ...state, isScopeEnabled: step === on };
			continue;
		}

		const viewKey = getViewKey(step);

		for (const sync of [1, 2]) {
			const { isSettled, ...result } = reduceMapScope(state, { view: step, viewKey }, items);

			expect(isSettled, `sync ${String(sync)}`).toBe(true);
			state = { ...result, viewKey };
		}
	}

	return { isScopeEnabled: state.isScopeEnabled, scope: state.scope };
}

function browse(steps: Parameters<typeof browseHeld>[0]) {
	const { isScopeEnabled, scope } = browseHeld(steps);

	return isScopeEnabled ? scope : undefined;
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
	test('a Scope turned off stays off on the page that set it and on a member Location', () => {
		expect(browse([{ scope: theme }, off, { scope: theme }])).toBeUndefined();
		expect(browse([{ scope: theme }, off, locationView('theater')])).toBeUndefined();
	});

	test('a Scope turned off is held through any Location, so it can be turned on again', () => {
		const held = { isScopeEnabled: false, scope: theme };

		expect(browseHeld([{ scope: theme }, off, locationView('theater')])).toEqual(held);
		expect(browseHeld([{ scope: theme }, off, locationView('temple')])).toEqual(held);
		expect(browseHeld([{ scope: theme }, off, locationView('unmapped'), noView])).toEqual(held);
		expect(browse([{ scope: theme }, off, locationView('temple'), on])).toBe(theme);
	});

	test('a Scope turned on again is cleared by the next Location outside it', () => {
		expect(
			browseHeld([{ scope: theme }, off, locationView('temple'), on, locationView('mine')]),
		).toEqual({ isScopeEnabled: true, scope: undefined });
	});

	test('a Scope turned off is set again by the next visit to its page', () => {
		expect(browse([{ scope: theme }, off, locationView('theater'), { scope: theme }])).toBe(theme);
		expect(browse([{ scope: theme }, off, noView, { scope: theme }])).toBe(theme);
	});

	test('a page that sets a Scope replaces one turned off, and its own is on', () => {
		expect(browse([{ scope: theme }, off, { scope: region }])).toBe(region);
	});

	test('a page with no view leaves the Scope untouched', () => {
		expect(browse([{ scope: theme }, noView, noView])).toBe(theme);
		expect(browse([noView])).toBeUndefined();
	});

	test('a Location view before source data waits, then decides once the data lands', () => {
		const state = { isScopeEnabled: true, scope: region, viewKey: getViewKey({ scope: region }) };
		const view = locationView('mine');
		const page = { view, viewKey: getViewKey(view) };

		expect(reduceMapScope(state, page, undefined)).toEqual({
			isScopeEnabled: true,
			isSettled: false,
			scope: region,
		});
		expect(reduceMapScope(state, page, items)).toEqual({
			isScopeEnabled: true,
			isSettled: true,
			scope: undefined,
		});
	});

	test('a view that sets a Scope, or finds none in force, never waits on source data', () => {
		const view = locationView('mine');

		expect(
			reduceMapScope(
				{ isScopeEnabled: true, scope: theme, viewKey: 'theme' },
				{ view: { scope: region }, viewKey: 'region' },
				undefined,
			),
		).toEqual({ isScopeEnabled: true, isSettled: true, scope: region });
		expect(
			reduceMapScope(
				{ isScopeEnabled: true, scope: undefined, viewKey: 'theme' },
				{ view, viewKey: getViewKey(view) },
				undefined,
			),
		).toEqual({ isScopeEnabled: true, isSettled: true, scope: undefined });
	});
});
