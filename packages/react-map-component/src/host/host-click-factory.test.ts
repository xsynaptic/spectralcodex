import { describe, expect, test } from 'vitest';

import type { MapClickInput } from '#host/host-click-factory.ts';

import { resolveClick } from '#host/host-click-factory.ts';

describe('resolveClick', () => {
	const pointId = 'point';
	const click = { isPick: false, kind: 'point', pointId } as const;
	const hosted: MapClickInput = {
		canOpen: true,
		hit: click,
		isPageHidden: false,
		pointUrl: '/some-location/',
		scopeUrl: undefined,
		targetIds: [],
	};
	const open = { isScopeRestored: false, kind: 'open', url: '/some-location/' };
	const loneTarget = { targetIds: [pointId] };
	const oneOfTwoTargets = { targetIds: [pointId, 'other'] };

	test('the empty map clears, and a cluster expands', () => {
		expect(resolveClick({ ...hosted, hit: { kind: 'empty' } })).toEqual({ kind: 'clear' });
		expect(
			resolveClick({ ...hosted, hit: { center: [1, 2], clusterId: 3, kind: 'cluster' } }),
		).toEqual({ center: [1, 2], clusterId: 3, kind: 'expand-cluster' });
	});

	test('a map that cannot open pages opens a popup, or nothing for a lone Target', () => {
		const unhosted = { ...hosted, canOpen: false };
		const popup = { isEased: true, kind: 'popup', pointId };

		expect(resolveClick(unhosted)).toEqual(popup);
		expect(resolveClick({ ...unhosted, ...oneOfTwoTargets })).toEqual({ ...popup, isEased: false });
		expect(resolveClick({ ...unhosted, ...loneTarget })).toEqual({ kind: 'none' });
	});

	test('a hosted map opens the page of a Point that has one, and a popup otherwise', () => {
		expect(resolveClick(hosted)).toEqual(open);
		expect(resolveClick({ ...hosted, pointUrl: undefined })).toEqual({
			isEased: true,
			kind: 'popup',
			pointId,
		});
	});

	test('a lone Target opens its own page so the host can bring it into view', () => {
		expect(resolveClick({ ...hosted, ...loneTarget })).toEqual(open);
	});

	test('one of several Targets opens its popup while the page is in view, and the page while it is not', () => {
		const target = { ...hosted, ...oneOfTwoTargets };

		expect(resolveClick(target)).toEqual({ isEased: false, kind: 'popup', pointId });
		expect(resolveClick({ ...target, isPageHidden: true })).toEqual(open);
	});

	test("a search pick eases to a Target's popup, which a click leaves where it is", () => {
		expect(
			resolveClick({ ...hosted, ...oneOfTwoTargets, hit: { ...click, isPick: true } }),
		).toEqual({ isEased: true, kind: 'popup', pointId });
	});

	test('a link opens in place on a hosted map and turns the held Scope back on when it is its page', () => {
		const link = { ...hosted, hit: { kind: 'link', url: '/regions/tainan/' } } as const;

		expect(resolveClick(link)).toEqual({
			isScopeRestored: false,
			kind: 'open',
			url: '/regions/tainan/',
		});
		expect(resolveClick({ ...link, scopeUrl: '/regions/tainan/' })).toEqual({
			isScopeRestored: true,
			kind: 'open',
			url: '/regions/tainan/',
		});
		expect(resolveClick({ ...link, canOpen: false })).toEqual({ kind: 'none' });
	});
});
