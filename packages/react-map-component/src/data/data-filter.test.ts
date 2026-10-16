import type { MapSourceItem } from '@spectralcodex/map-codec';

import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapFilterState } from '#data/data-filter.ts';
import type { MapFeaturesRule } from '#types.ts';

import { getHiddenTargetIds, getMapCanvasData } from '#data/data-filter.ts';

const passAll: MapFilterState = {
	objective: 1,
	rating: 1,
	status: [],
};

function makeItem(properties: Partial<MapSourceItem['properties']> = {}): MapSourceItem {
	return {
		geometry: { coordinates: [0, 0], type: GeometryTypeEnum.Point },
		properties: {
			category: LocationCategoryEnum.Unknown,
			entryQuality: 1,
			hasImage: false,
			id: 'location-id',
			outlier: false,
			precision: 3,
			rating: 3,
			status: LocationStatusEnum.Abandoned,
			title: 'Location',
			...properties,
		},
		type: 'Feature',
	};
}

function getDrawnIds(result: ReturnType<typeof getMapCanvasData>) {
	return result.pointCollection.features.map(({ properties }) => properties.id);
}

function isDrawn(item: MapSourceItem, filter: MapFilterState) {
	return getDrawnIds(getMapCanvasData([item], filter)).includes(item.properties.id);
}

describe('getMapCanvasData visibility', () => {
	test('status is an exclude-list', () => {
		const item = makeItem({ status: LocationStatusEnum.Abandoned });

		expect(isDrawn(item, { ...passAll, status: [LocationStatusEnum.Abandoned] })).toBe(false);
		expect(isDrawn(item, { ...passAll, status: [LocationStatusEnum.Active] })).toBe(true);
	});

	test('a missing objective is never hidden by the objective threshold', () => {
		expect(isDrawn(makeItem(), { ...passAll, objective: 5 })).toBe(true);
	});

	test('every threshold is an inclusive minimum', () => {
		const atThreshold: MapFilterState = { objective: 3, rating: 3, status: [] };
		const onTheLine = { objective: 3, rating: 3 };

		expect(isDrawn(makeItem(onTheLine), atThreshold)).toBe(true);
		expect(isDrawn(makeItem({ ...onTheLine, rating: 2 }), atThreshold)).toBe(false);
		expect(isDrawn(makeItem({ ...onTheLine, objective: 2 }), atThreshold)).toBe(false);
	});
});

describe('getMapCanvasData', () => {
	test('draws the decoded rows themselves, which carry no id', () => {
		const item = makeItem();

		const feature = getMapCanvasData([item], passAll).pointCollection.features[0];

		expect(feature).toBe(item);
		expect(feature && 'id' in feature).toBe(false);
	});

	test('a hidden item is neither drawn nor counted as filtered', () => {
		const result = getMapCanvasData([makeItem({ rating: 1 }), makeItem()], {
			...passAll,
			rating: 3,
		});

		expect(result.filteredCount).toBe(1);
		expect(result.totalCount).toBe(2);
	});

	test('a pinned item is drawn whatever the filter hides', () => {
		const result = getMapCanvasData(
			[makeItem({ id: 'target', rating: 1 }), makeItem({ id: 'other', rating: 1 })],
			{ ...passAll, pinnedIds: ['target'], rating: 3 },
		);

		expect(getDrawnIds(result)).toEqual(['target']);
	});

	test('a pinned item outside the Scope stays out', () => {
		const result = getMapCanvasData(
			[makeItem({ id: 'target', themeIndices: [1] })],
			{ ...passAll, pinnedIds: ['target'] },
			{ index: 2, type: 'theme' },
		);

		expect(result.pointCollection.features).toEqual([]);
	});

	test('empty input yields an empty collection and zero counts', () => {
		const result = getMapCanvasData([], passAll);

		expect(result.pointCollection.features).toEqual([]);
		expect(result.filteredCount).toBe(0);
		expect(result.totalCount).toBe(0);
	});
});

describe('getHiddenTargetIds', () => {
	const items = [makeItem({ id: 'hidden', rating: 1 }), makeItem({ id: 'visible', rating: 5 })];
	const filter = { ...passAll, rating: 3 };

	test('only Targets the filter hides are returned', () => {
		expect(getHiddenTargetIds(items, ['hidden', 'visible'], filter)).toEqual(['hidden']);
	});

	test('a hidden item that is no Target is left to the filter', () => {
		expect(getHiddenTargetIds(items, ['visible'], filter)).toEqual([]);
	});
});

describe('getMapCanvasData scope', () => {
	const inside = makeItem({ id: 'inside', regionOrdinals: [5] });
	const outside = makeItem({ id: 'outside', regionOrdinals: [99] });

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
