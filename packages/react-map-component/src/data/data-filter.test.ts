import type { MapSourceItem } from '@spectralcodex/map-codec';

import { LocationStatusEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapFilterState } from '#data/data-filter.ts';
import type { MapFeaturesRule } from '#types.ts';

import { getHiddenTargetIds, getMapCanvasData } from '#data/data-filter.ts';
import { makeMapSourceItem } from '#lib/map-test-utils.ts';

const passAll: MapFilterState = {
	objective: 1,
	rating: 1,
	status: [],
};

function getDrawnIds(result: ReturnType<typeof getMapCanvasData>) {
	return result.pointCollection.features.map(({ properties }) => properties.id);
}

function isDrawn(item: MapSourceItem, filter: MapFilterState) {
	return getDrawnIds(getMapCanvasData([item], filter)).includes(item.properties.id);
}

describe('getMapCanvasData visibility', () => {
	test('status is an exclude-list', () => {
		const item = makeMapSourceItem({ status: LocationStatusEnum.Abandoned });

		expect(isDrawn(item, { ...passAll, status: [LocationStatusEnum.Abandoned] })).toBe(false);
		expect(isDrawn(item, { ...passAll, status: [LocationStatusEnum.Active] })).toBe(true);
	});

	test('a missing objective is never hidden by the objective threshold', () => {
		expect(isDrawn(makeMapSourceItem(), { ...passAll, objective: 5 })).toBe(true);
	});

	test('every threshold is an inclusive minimum', () => {
		const atThreshold: MapFilterState = { objective: 3, rating: 3, status: [] };
		const onTheLine = { objective: 3, rating: 3 };

		expect(isDrawn(makeMapSourceItem(onTheLine), atThreshold)).toBe(true);
		expect(isDrawn(makeMapSourceItem({ ...onTheLine, rating: 2 }), atThreshold)).toBe(false);
		expect(isDrawn(makeMapSourceItem({ ...onTheLine, objective: 2 }), atThreshold)).toBe(false);
	});
});

describe('getMapCanvasData', () => {
	test('a hidden item is neither drawn nor counted as filtered', () => {
		const result = getMapCanvasData([makeMapSourceItem({ rating: 1 }), makeMapSourceItem()], {
			...passAll,
			rating: 3,
		});

		expect(result.filteredCount).toBe(1);
		expect(result.totalCount).toBe(2);
	});

	test('a pinned item is drawn whatever the filter hides', () => {
		const result = getMapCanvasData(
			[
				makeMapSourceItem({ id: 'target', rating: 1 }),
				makeMapSourceItem({ id: 'other', rating: 1 }),
			],
			{ ...passAll, pinnedIds: ['target'], rating: 3 },
		);

		expect(getDrawnIds(result)).toEqual(['target']);
	});

	test('a pinned item outside the Scope stays out', () => {
		const result = getMapCanvasData(
			[makeMapSourceItem({ id: 'target', themeIndices: [1] })],
			{ ...passAll, pinnedIds: ['target'] },
			{ index: 2, type: 'theme' },
		);

		expect(result.pointCollection.features).toEqual([]);
	});
});

describe('getHiddenTargetIds', () => {
	const items = [
		makeMapSourceItem({ id: 'hidden', rating: 1 }),
		makeMapSourceItem({ id: 'visible', rating: 5 }),
	];
	const filter = { ...passAll, rating: 3 };

	test('only Targets the filter hides are returned', () => {
		expect(getHiddenTargetIds(items, ['hidden', 'visible'], filter)).toEqual(['hidden']);
		expect(getHiddenTargetIds(items, ['visible'], filter)).toEqual([]);
	});
});

describe('getMapCanvasData scope', () => {
	const inside = makeMapSourceItem({ id: 'inside', regionOrdinals: [5] });
	const outside = makeMapSourceItem({ id: 'outside', regionOrdinals: [99] });

	const scopeRule: MapFeaturesRule = { interval: [4, 10], type: 'region' };

	test('items outside the Scope are not drawn, and the total is the Scope size', () => {
		const result = getMapCanvasData([inside, outside], passAll, scopeRule);

		expect(getDrawnIds(result)).toEqual(['inside']);
		expect(result.totalCount).toBe(1);
		expect(result.filteredCount).toBe(1);
	});

	test('a filter that empties the Scope leaves a blank map and the Scope size as the total', () => {
		const result = getMapCanvasData(
			[inside, outside],
			{ ...passAll, status: [LocationStatusEnum.Abandoned] },
			scopeRule,
		);

		expect(result.pointCollection.features).toEqual([]);
		expect(result.filteredCount).toBe(0);
		expect(result.totalCount).toBe(1);
	});
});
