import { fc, test } from '@fast-check/vitest';
import { describe, expect } from 'vitest';

import type { MapScope, MapView } from '#types.ts';

import { resolveClick } from '#host/host-click-factory.ts';
import { makeMapSourceItem } from '#lib/map-test-utils.ts';
import { createMapStore, isScopePending } from '#store/store-factory.ts';
import { reduceMapScope } from '#store/store-scope.ts';

const items = [
	makeMapSourceItem({ id: 'theater', regionOrdinals: [12], themeIndices: [3] }),
	makeMapSourceItem({ id: 'theater-1', regionOrdinals: [12], themeIndices: [3] }),
	makeMapSourceItem({ id: 'cinema', regionOrdinals: [40], themeIndices: [3] }),
	makeMapSourceItem({ id: 'temple', regionOrdinals: [14] }),
	makeMapSourceItem({ id: 'mine', regionOrdinals: [40] }),
];

const theme: MapScope = {
	rule: { index: 3, type: 'theme' },
	title: 'Theaters',
	url: '/themes/theaters/',
};

const region: MapScope = {
	apiDivisionUrl: '/api/map/divisions/tainan.json',
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
	const store = createMapStore();
	const { setScopeEnabled, syncView } = store.getState().actions;

	for (const step of steps) {
		if (step === off || step === on) {
			setScopeEnabled(step === on);
			continue;
		}

		const page = { view: step, viewKey: getViewKey(step) };

		syncView(page, items);
		syncView(page, items);
	}

	const { isScopeEnabled, scope } = store.getState();

	return { isScopeEnabled, scope };
}

function browse(steps: Parameters<typeof browseHeld>[0]) {
	const { isScopeEnabled, scope } = browseHeld(steps);

	return isScopeEnabled ? scope : undefined;
}

describe('reduceMapScope', () => {
	test.each([
		{ name: 'a Theme', scope: theme, steps: [{ scope: theme }] },
		{
			name: 'a Region reached from a member Location',
			scope: region,
			steps: [{ scope: theme }, locationView('theater'), { scope: region }],
		},
		{
			name: 'a Region over a Scope turned off',
			scope: region,
			steps: [{ scope: theme }, off, { scope: region }],
		},
		{
			name: 'the next visit to the page of a Scope turned off, after a member Location',
			scope: theme,
			steps: [{ scope: theme }, off, locationView('theater'), { scope: theme }],
		},
		{
			name: 'the next visit to the page of a Scope turned off, after a page with no view',
			scope: theme,
			steps: [{ scope: theme }, off, noView, { scope: theme }],
		},
	] satisfies Array<{ name: string; scope: MapScope; steps: Parameters<typeof browse>[0] }>)(
		'a page that sets a Scope turns it on: $name',
		({ scope, steps }) => {
			expect(browse(steps)).toBe(scope);
		},
	);

	test('a member Location keeps the Scope', () => {
		expect(browse([{ scope: theme }, locationView('theater', 'theater-1')])).toBe(theme);
		expect(browse([{ scope: region }, locationView('temple')])).toBe(region);
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

	test('a page with no view leaves the Scope untouched', () => {
		expect(browse([{ scope: theme }, noView, noView])).toBe(theme);
		expect(browse([noView])).toBeUndefined();
	});

	test('a Location view keeps the Scope without rows, and decides with them', () => {
		const state = { isScopeEnabled: true, pendingTargetIds: [], scope: region };
		const view = locationView('mine');
		const page = { view, viewKey: getViewKey(view) };

		expect(reduceMapScope(state, page, undefined)).toEqual({
			isScopeEnabled: true,
			pendingTargetIds: [['mine']],
			scope: region,
		});
		expect(reduceMapScope(state, page, items)).toEqual({
			isScopeEnabled: true,
			pendingTargetIds: [],
			scope: undefined,
		});
	});

	test('a view that sets a Scope, or finds none in force, needs no rows', () => {
		const view = locationView('mine');

		expect(
			reduceMapScope(
				{ isScopeEnabled: true, pendingTargetIds: [['temple']], scope: theme },
				{ view: { scope: region }, viewKey: 'region' },
				undefined,
			),
		).toEqual({ isScopeEnabled: true, pendingTargetIds: [], scope: region });
		expect(
			reduceMapScope(
				{ isScopeEnabled: true, pendingTargetIds: [], scope: undefined },
				{ view, viewKey: getViewKey(view) },
				undefined,
			),
		).toEqual({ isScopeEnabled: true, pendingTargetIds: [], scope: undefined });
	});

	test('rows that arrive after a failed fetch resolve the Location, though its re-sync is deduped', () => {
		const store = createMapStore({ view: { scope: region }, viewKey: 'region' });
		const { resolveScope, syncView } = store.getState().actions;
		const view = locationView('mine');
		const page = { view, viewKey: getViewKey(view) };

		syncView(page, undefined);
		syncView(page, undefined);
		expect(store.getState().scope).toBe(region);

		resolveScope(items);
		expect(store.getState().scope).toBeUndefined();
	});

	test('rows resolve every Location opened without them, not only the last', () => {
		const store = createMapStore({ view: { scope: region }, viewKey: 'region' });
		const { resolveScope, syncView } = store.getState().actions;

		for (const view of [locationView('mine'), locationView('temple'), noView]) {
			syncView({ view, viewKey: getViewKey(view) }, undefined);
		}

		resolveScope(items);
		expect(store.getState().scope).toBeUndefined();
	});
});

// verify/models/map-scope states these claims
describe('the Scope over any walk through the Atlas', () => {
	const pageNames = ['tainan', 'theaters', 'temple', 'theater', 'cinema', 'mine', 'about'] as const;

	type PageName = (typeof pageNames)[number];

	const scopeByPage = new Map<PageName, MapScope>([
		['tainan', region],
		['theaters', theme],
	]);

	const viewByPage: Record<PageName, MapView> = {
		about: noView,
		cinema: locationView('cinema'),
		mine: locationView('mine'),
		tainan: { scope: region },
		temple: locationView('temple'),
		theater: locationView('theater', 'theater-1'),
		theaters: { scope: theme },
	};

	// The glossary's membership, written out rather than computed from the rules
	const scopesByLocation = new Map<PageName, Array<MapScope>>([
		['cinema', [theme]],
		['mine', []],
		['temple', [region]],
		['theater', [region, theme]],
	]);

	function getUrl(name: PageName) {
		return scopeByPage.get(name)?.url ?? `/${name}/`;
	}

	interface Shown {
		isScopeEnabled: boolean;
		scope: MapScope | undefined;
	}

	function arrive(want: Shown, name: PageName): Shown {
		const pageScope = scopeByPage.get(name);

		if (pageScope) return { isScopeEnabled: true, scope: pageScope };

		const scopes = scopesByLocation.get(name);

		if (!scopes || !want.isScopeEnabled || !want.scope) return want;

		return scopes.includes(want.scope) ? want : { ...want, scope: undefined };
	}

	const pageStep = fc.oneof(
		fc.record({ kind: fc.constant('link'), page: fc.constantFrom(...pageNames) }),
		fc.record({ kind: fc.constant('map'), page: fc.constantFrom(...pageNames) }),
		fc.record({ kind: fc.constant('name') }),
		fc.record({ kind: fc.constant('switch') }),
		fc.record({ kind: fc.constant('resync') }),
	);

	// Rare, so a walk opens several pages before the rows arrive
	const step = fc.oneof(
		{ arbitrary: pageStep, weight: 6 },
		{ arbitrary: fc.record({ kind: fc.constant('land') }), weight: 1 },
	);

	const reached = { cleared: 0, clearedLate: 0, held: 0, kept: 0, restored: 0 };

	function countArrival(name: PageName, before: Shown, after: Shown) {
		if (!scopesByLocation.has(name) || !before.scope) return;

		if (!before.isScopeEnabled) reached.held += 1;
		else if (after.scope) reached.kept += 1;
		else reached.cleared += 1;
	}

	function createWalk(start: PageName) {
		type WalkStep = typeof step extends fc.Arbitrary<infer Step> ? Step : never;

		const store = createMapStore({
			view: viewByPage[start],
			viewKey: getViewKey(viewByPage[start]),
		});
		const { applyClick, resolveScope, setScopeEnabled, syncView } = store.getState().actions;
		let current = start;
		let hasRows = false;
		let want: Shown = { isScopeEnabled: true, scope: scopeByPage.get(start) };

		function sync(name: PageName) {
			syncView(
				{ view: viewByPage[name], viewKey: getViewKey(viewByPage[name]) },
				hasRows ? items : undefined,
			);
		}

		function open(name: PageName) {
			const after = arrive(want, name);

			countArrival(name, want, after);
			current = name;
			want = after;
			sync(name);
		}

		function openFromMap(name: PageName) {
			const state = store.getState();
			const url = getUrl(name);

			applyClick(
				resolveClick({
					canOpen: true,
					hit: { kind: 'link', url },
					isPageHidden: false,
					pointUrl: undefined,
					scopeUrl: state.scope?.url,
					targetIds: state.view.targetIds ?? [],
				}),
			);

			if (url === want.scope?.url) {
				if (!want.isScopeEnabled) reached.restored += 1;
				want = { ...want, isScopeEnabled: true };
			}

			if (name !== current) open(name);
		}

		function land() {
			if (hasRows) return;

			const before = store.getState().scope;

			hasRows = true;
			resolveScope(items);
			if (before && !store.getState().scope) reached.clearedLate += 1;
		}

		// A link to the page already open changes nothing; its deduped sync is the resync step
		function followLink(name: PageName) {
			if (name !== current) open(name);
		}

		// A Point needs rows; a Scope page opens from the bar's name or a search pick
		function pick(name: PageName) {
			if (hasRows || scopeByPage.has(name)) openFromMap(name);
		}

		function openHeldName() {
			const { scope } = store.getState();
			const heldPage = pageNames.find((name) => scopeByPage.get(name) === scope);

			if (heldPage) openFromMap(heldPage);
		}

		function toggle() {
			const state = store.getState();

			if (!state.scope || isScopePending(state)) return;

			setScopeEnabled(!state.isScopeEnabled);
			want = { ...want, isScopeEnabled: !want.isScopeEnabled };
		}

		function take(next: WalkStep) {
			switch (next.kind) {
				case 'land': {
					land();
					break;
				}
				case 'link': {
					followLink(next.page);
					break;
				}
				case 'map': {
					pick(next.page);
					break;
				}
				case 'name': {
					openHeldName();
					break;
				}
				case 'resync': {
					sync(current);
					break;
				}
				case 'switch': {
					toggle();
					break;
				}
			}
		}

		// Before rows arrive the map cannot know a Location's Scope, so only the model's held and on rules apply
		function check() {
			const state = store.getState();
			const shown = { isScopeEnabled: state.isScopeEnabled, scope: state.scope };

			if (hasRows) {
				expect(isScopePending(state)).toBe(false);
				expect(shown).toEqual(want);
				return;
			}

			if (!want.isScopeEnabled || want.scope) expect(shown).toEqual(want);
		}

		return { check, take };
	}

	test.prop([fc.constantFrom(...pageNames), fc.array(step, { maxLength: 20, size: 'max' })], {
		numRuns: 500,
	})(
		'a Location keeps or clears it, a Scope switched off is held, and reopening its page turns it on',
		(start, steps) => {
			const walk = createWalk(start);

			for (const next of steps) {
				walk.take(next);
				walk.check();
			}
		},
	);

	test('the walks reached every case the claims cover', () => {
		for (const [name, count] of Object.entries(reached)) {
			expect(count, name).toBeGreaterThan(0);
		}
	});
});
