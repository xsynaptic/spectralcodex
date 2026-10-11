import type { MapSourceItem } from '@spectralcodex/map-codec';

import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapFilterState } from '#canvas/canvas-data-filter.ts';
import type { MapFeaturesRule } from '#types.ts';

import {
	getHiddenTargetIds,
	getMapCanvasData,
	isLocationVisible,
} from '#canvas/canvas-data-filter.ts';

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
		expect(result.totalCount).toBe(2); // totalCount is the map features total, before visibility
	});

	test('a pinned item is drawn whatever the filter hides', () => {
		const result = getMapCanvasData(
			[makeItem({ entryQuality: 1, id: 'target' }), makeItem({ entryQuality: 1, id: 'other' })],
			{ ...passAll, entryQuality: 3, pinnedIds: ['target'] },
		);

		expect(result.pointCollection?.features.map(({ properties }) => properties.id)).toEqual([
			'target',
		]);
	});

	test('a pinned item outside the map features stays out', () => {
		const result = getMapCanvasData(
			[makeItem({ id: 'target', themeIndices: [1] })],
			{ ...passAll, pinnedIds: ['target'] },
			{ mapFeaturesRule: { index: 2, type: 'theme' } },
		);

		expect(result.pointCollection).toBeUndefined();
	});

	test('empty input yields undefined collections and zero counts', () => {
		const result = getMapCanvasData([], passAll);

		expect(result.pointCollection).toBeUndefined();
		expect(result.lineStringCollection).toBeUndefined();
		expect(result.filteredCount).toBe(0);
		expect(result.totalCount).toBe(0);
	});
});

describe('getHiddenTargetIds', () => {
	const items = [
		makeItem({ entryQuality: 1, id: 'hidden' }),
		makeItem({ entryQuality: 5, id: 'visible' }),
	];
	const filter = { ...passAll, entryQuality: 3 };

	test('only Targets the filter hides are returned', () => {
		expect(getHiddenTargetIds(items, ['hidden', 'visible'], filter)).toEqual(['hidden']);
	});

	test('a hidden item that is no Target is left to the filter', () => {
		expect(getHiddenTargetIds(items, ['visible'], filter)).toEqual([]);
	});
});

describe('getMapCanvasData map features', () => {
	const inside = makeItem({ id: 'inside', regionOrdinals: [5], themeIndices: [2] });
	const outside = makeItem({ id: 'outside', regionOrdinals: [99], themeIndices: [7] });

	test('theme rule keeps only points carrying the theme index', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			mapFeaturesRule: { index: 2, type: 'theme' },
		});

		expect(result.totalCount).toBe(1);
		expect(result.pointCollection?.features[0]?.properties.id).toBe('inside');
	});

	test('ids rule preserves the list order', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			mapFeaturesRule: { ids: ['outside', 'inside'], type: 'ids' },
		});

		expect(result.pointCollection?.features.map((feature) => feature.properties.id)).toEqual([
			'outside',
			'inside',
		]);
	});

	test('region rule is inclusive at both ends of the interval', () => {
		const items = [
			makeItem({ id: 'below-left', regionOrdinals: [3] }),
			makeItem({ id: 'at-left', regionOrdinals: [4] }),
			makeItem({ id: 'at-right', regionOrdinals: [10] }),
			makeItem({ id: 'above-right', regionOrdinals: [11] }),
		];

		const result = getMapCanvasData(items, passAll, {
			mapFeaturesRule: { interval: [4, 10], type: 'region' },
		});

		expect(result.pointCollection?.features.map((feature) => feature.properties.id)).toEqual([
			'at-left',
			'at-right',
		]);
	});

	test('an item in several regions is kept when any one ordinal is inside', () => {
		const item = makeItem({ id: 'multi', regionOrdinals: [99, 5] });

		const result = getMapCanvasData([item], passAll, {
			mapFeaturesRule: { interval: [1, 10], type: 'region' },
		});

		expect(result.totalCount).toBe(1);
	});

	test('ids rule drops ids missing from the index', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			mapFeaturesRule: { ids: ['inside', 'nope'], type: 'ids' },
		});

		expect(result.totalCount).toBe(1);
		expect(result.pointCollection?.features.map((feature) => feature.properties.id)).toEqual([
			'inside',
		]);
	});

	test('points missing the relevant column are excluded by a rule', () => {
		const bare = makeItem({ id: 'bare' });

		expect(
			getMapCanvasData([bare], passAll, { mapFeaturesRule: { interval: [1, 10], type: 'region' } })
				.totalCount,
		).toBe(0);
		expect(
			getMapCanvasData([bare], passAll, { mapFeaturesRule: { index: 2, type: 'theme' } })
				.totalCount,
		).toBe(0);
	});

	test('no rule keeps every point', () => {
		const result = getMapCanvasData([inside, outside], passAll);

		expect(result.totalCount).toBe(2);
	});
});

describe('getMapCanvasData page features', () => {
	const inside = makeItem({ id: 'inside', regionOrdinals: [5] });
	const outside = makeItem({ id: 'outside', regionOrdinals: [99] });
	const outsideLine = makeItem({ id: 'outside-line', regionOrdinals: [99] }, lineGeometry);

	const mapFeaturesRule: MapFeaturesRule = { interval: [1, 100], type: 'region' };
	const pageFeaturesRule: MapFeaturesRule = { interval: [4, 10], type: 'region' };

	test('items outside the page features stay on the map, marked', () => {
		const result = getMapCanvasData([inside, outside, outsideLine], passAll, {
			mapFeaturesRule,
			pageFeaturesRule,
		});

		expect(result.totalCount).toBe(3);
		expect(result.filteredCount).toBe(3);
		expect(
			result.pointCollection?.features.map(({ properties }) => properties.isOtherFeature),
		).toEqual([undefined, true]);
		expect(result.lineStringCollection?.features[0]?.properties.isOtherFeature).toBe(true);
	});

	test('a marked item is a copy; the cached source item is never marked', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			mapFeaturesRule,
			pageFeaturesRule,
		});
		const [insideFeature, outsideFeature] = result.pointCollection?.features ?? [];

		expect(insideFeature?.properties).toBe(inside.properties);
		expect(outsideFeature?.properties).not.toBe(outside.properties);
		expect('isOtherFeature' in outside.properties).toBe(false);
	});

	test('map features still remove; page features only mark what is left', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			mapFeaturesRule: { interval: [1, 10], type: 'region' },
			pageFeaturesRule,
		});

		expect(result.pointCollection?.features.map(({ properties }) => properties.id)).toEqual([
			'inside',
		]);
	});

	test('page features covering the whole map mark nothing', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			mapFeaturesRule,
			pageFeaturesRule: mapFeaturesRule,
		});

		expect(
			result.pointCollection?.features.some(({ properties }) => properties.isOtherFeature),
		).toBe(false);
	});

	test('a filter hides an other feature like any item', () => {
		const result = getMapCanvasData(
			[inside, outside],
			{ ...passAll, status: [LocationStatusEnum.Abandoned] },
			{ mapFeaturesRule, pageFeaturesRule },
		);

		expect(result.filteredCount).toBe(0);
	});
});
