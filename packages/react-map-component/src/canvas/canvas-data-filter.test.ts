import type { MapSourceItem } from '@spectralcodex/map-codec';

import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapFilterState } from '#canvas/canvas-data-filter.ts';

import { getMapCanvasData, isLocationVisible } from '#canvas/canvas-data-filter.ts';

const passAll: MapFilterState = {
	entryQuality: 1,
	objective: 1,
	rating: 1,
	status: [],
};

const pointGeometry = {
	coordinates: [0, 0],
	type: GeometryTypeEnum.Point,
} satisfies MapSourceItem['geometry'];

function makeItem(
	properties: Partial<MapSourceItem['properties']> = {},
	geometry: MapSourceItem['geometry'] = pointGeometry,
): MapSourceItem {
	return {
		geometry,
		properties: {
			category: LocationCategoryEnum.Unknown,
			entryQuality: 3,
			hasImage: false,
			id: 'location-id',
			outlier: false,
			precision: 3,
			rating: 3,
			status: LocationStatusEnum.Abandoned,
			title: 'Location',
			...properties,
		},
	};
}

const lineGeometry = {
	coordinates: [
		[0, 0],
		[1, 1],
	],
	type: GeometryTypeEnum.LineString,
} satisfies MapSourceItem['geometry'];

const polygonGeometry = {
	coordinates: [
		[
			[0, 0],
			[1, 1],
			[2, 0],
			[0, 0],
		],
	],
	type: GeometryTypeEnum.Polygon,
} satisfies MapSourceItem['geometry'];

describe('isLocationVisible', () => {
	test('status is an exclude-list', () => {
		const properties = makeItem({ status: LocationStatusEnum.Abandoned }).properties;

		expect(
			isLocationVisible(properties, { ...passAll, status: [LocationStatusEnum.Abandoned] }),
		).toBe(false);
		expect(isLocationVisible(properties, { ...passAll, status: [LocationStatusEnum.Active] })).toBe(
			true,
		);
	});

	test('a missing objective is never hidden by the objective threshold', () => {
		expect(isLocationVisible(makeItem().properties, { ...passAll, objective: 5 })).toBe(true);
	});

	test('every threshold is an inclusive minimum', () => {
		const atThreshold: MapFilterState = { entryQuality: 3, objective: 3, rating: 3, status: [] };
		const onTheLine = { entryQuality: 3, objective: 3, rating: 3 };

		expect(isLocationVisible(makeItem(onTheLine).properties, atThreshold)).toBe(true);
		expect(
			isLocationVisible(makeItem({ ...onTheLine, entryQuality: 2 }).properties, atThreshold),
		).toBe(false);
		expect(isLocationVisible(makeItem({ ...onTheLine, rating: 2 }).properties, atThreshold)).toBe(
			false,
		);
		expect(
			isLocationVisible(makeItem({ ...onTheLine, objective: 2 }).properties, atThreshold),
		).toBe(false);
	});
});

describe('getMapCanvasData', () => {
	test('partitions point and line into their own collections; polygons build nothing', () => {
		const result = getMapCanvasData(
			[makeItem(), makeItem({}, lineGeometry), makeItem({}, polygonGeometry)],
			passAll,
		);

		expect(result.pointCollection?.features).toHaveLength(1);
		expect(result.lineStringCollection?.features).toHaveLength(1);
		expect('polygonCollection' in result).toBe(false);
	});

	test('filteredCount counts drawn features only; totalCount counts every survivor', () => {
		const result = getMapCanvasData(
			[makeItem(), makeItem({}, lineGeometry), makeItem({}, polygonGeometry)],
			passAll,
		);

		expect(result.filteredCount).toBe(2);
		expect(result.totalCount).toBe(3);
	});

	test('emits frozen feature shape without id', () => {
		const item = makeItem();

		const feature = getMapCanvasData([item], passAll).pointCollection?.features[0];

		expect(feature).toEqual({
			geometry: item.geometry,
			properties: item.properties,
			type: 'Feature',
		});
		expect(feature && 'id' in feature).toBe(false);
	});

	test('a hidden item is neither drawn nor counted as filtered', () => {
		const result = getMapCanvasData([makeItem({ entryQuality: 1 }), makeItem()], {
			...passAll,
			entryQuality: 3,
		});

		expect(result.filteredCount).toBe(1);
		expect(result.totalCount).toBe(2); // totalCount is the scoped total, before visibility
	});

	test('empty input yields undefined collections and zero counts', () => {
		const result = getMapCanvasData([], passAll);

		expect(result.pointCollection).toBeUndefined();
		expect(result.lineStringCollection).toBeUndefined();
		expect(result.filteredCount).toBe(0);
		expect(result.totalCount).toBe(0);
	});
});

describe('getMapCanvasData scope', () => {
	const inside = makeItem({ id: 'inside', regionOrdinals: [5], themeIndices: [2] });
	const outside = makeItem({ id: 'outside', regionOrdinals: [99], themeIndices: [7] });

	test('theme scope keeps only points carrying the theme index', () => {
		const result = getMapCanvasData([inside, outside], passAll, { index: 2, type: 'theme' });

		expect(result.totalCount).toBe(1);
		expect(result.pointCollection?.features[0]?.properties.id).toBe('inside');
	});

	test('ids scope preserves the list order', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			ids: ['outside', 'inside'],
			type: 'ids',
		});

		expect(result.pointCollection?.features.map((feature) => feature.properties.id)).toEqual([
			'outside',
			'inside',
		]);
	});

	test('region scope is inclusive at both ends of the interval', () => {
		const items = [
			makeItem({ id: 'below-left', regionOrdinals: [3] }),
			makeItem({ id: 'at-left', regionOrdinals: [4] }),
			makeItem({ id: 'at-right', regionOrdinals: [10] }),
			makeItem({ id: 'above-right', regionOrdinals: [11] }),
		];

		const result = getMapCanvasData(items, passAll, { interval: [4, 10], type: 'region' });

		expect(result.pointCollection?.features.map((feature) => feature.properties.id)).toEqual([
			'at-left',
			'at-right',
		]);
	});

	test('an item in several regions is kept when any one ordinal is inside', () => {
		const item = makeItem({ id: 'multi', regionOrdinals: [99, 5] });

		const result = getMapCanvasData([item], passAll, { interval: [1, 10], type: 'region' });

		expect(result.totalCount).toBe(1);
	});

	test('ids scope drops ids missing from the index', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			ids: ['inside', 'nope'],
			type: 'ids',
		});

		expect(result.totalCount).toBe(1);
		expect(result.pointCollection?.features.map((feature) => feature.properties.id)).toEqual([
			'inside',
		]);
	});

	test('points missing the relevant column are excluded by a scope', () => {
		const bare = makeItem({ id: 'bare' });

		expect(
			getMapCanvasData([bare], passAll, { interval: [1, 10], type: 'region' }).totalCount,
		).toBe(0);
		expect(getMapCanvasData([bare], passAll, { index: 2, type: 'theme' }).totalCount).toBe(0);
	});

	test('no scope leaves every point in scope', () => {
		const result = getMapCanvasData([inside, outside], passAll);

		expect(result.totalCount).toBe(2);
	});
});
