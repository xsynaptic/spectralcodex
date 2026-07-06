import {
	GeometryTypeEnum,
	LocationCategoryEnum,
	LocationStatusEnum,
} from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import type { MapSourceItemParsed } from '../types';
import type { MapFilterState } from './canvas-data-filter';

import { getMapCanvasData, isLocationVisible } from './canvas-data-filter';

const passAll: MapFilterState = {
	status: [],
	quality: 1,
	rating: 1,
	objective: 1,
};

const pointGeometry = {
	type: GeometryTypeEnum.Point,
	coordinates: [0, 0],
} satisfies MapSourceItemParsed['geometry'];

function makeItem(
	properties: Partial<MapSourceItemParsed['properties']> = {},
	geometry: MapSourceItemParsed['geometry'] = pointGeometry,
): MapSourceItemParsed {
	return {
		properties: {
			id: 'location-id',
			title: 'Location',
			category: LocationCategoryEnum.Unknown,
			status: LocationStatusEnum.Abandoned,
			precision: 3,
			quality: 3,
			rating: 3,
			outlier: false,
			hasImage: false,
			...properties,
		},
		geometry,
	};
}

const lineGeometry = {
	type: GeometryTypeEnum.LineString,
	coordinates: [
		[0, 0],
		[1, 1],
	],
} satisfies MapSourceItemParsed['geometry'];

const polygonGeometry = {
	type: GeometryTypeEnum.Polygon,
	coordinates: [
		[
			[0, 0],
			[1, 1],
			[2, 0],
			[0, 0],
		],
	],
} satisfies MapSourceItemParsed['geometry'];

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

	test('quality and rating are minimum thresholds', () => {
		expect(isLocationVisible(makeItem({ quality: 2 }).properties, { ...passAll, quality: 3 })).toBe(
			false,
		);
		expect(isLocationVisible(makeItem({ rating: 4 }).properties, { ...passAll, rating: 3 })).toBe(
			true,
		);
	});

	test('a missing objective is never hidden by the objective threshold', () => {
		expect(isLocationVisible(makeItem().properties, { ...passAll, objective: 5 })).toBe(true);
	});

	test('a present objective below the threshold is hidden', () => {
		expect(
			isLocationVisible(makeItem({ objective: 2 }).properties, { ...passAll, objective: 3 }),
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
			type: 'Feature',
			properties: item.properties,
			geometry: item.geometry,
		});
		expect(feature && 'id' in feature).toBe(false);
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

	test('region scope keeps only points whose ordinal is inside the interval', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			type: 'region',
			interval: [1, 10],
		});

		expect(result.totalCount).toBe(1);
		expect(result.pointCollection?.features[0]?.properties.id).toBe('inside');
	});

	test('theme scope keeps only points carrying the theme index', () => {
		const result = getMapCanvasData([inside, outside], passAll, { type: 'theme', index: 2 });

		expect(result.totalCount).toBe(1);
		expect(result.pointCollection?.features[0]?.properties.id).toBe('inside');
	});

	test('ids scope keeps only the listed ids', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			type: 'ids',
			ids: ['outside'],
		});

		expect(result.totalCount).toBe(1);
		expect(result.pointCollection?.features[0]?.properties.id).toBe('outside');
	});

	test('ids scope preserves the list order', () => {
		const result = getMapCanvasData([inside, outside], passAll, {
			type: 'ids',
			ids: ['outside', 'inside'],
		});

		expect(result.pointCollection?.features.map((feature) => feature.properties.id)).toEqual([
			'outside',
			'inside',
		]);
	});

	test('points missing the relevant column are excluded by a scope', () => {
		const bare = makeItem({ id: 'bare' });

		const result = getMapCanvasData([bare], passAll, { type: 'region', interval: [1, 10] });

		expect(result.totalCount).toBe(0);
	});

	test('no scope leaves every point in scope', () => {
		const result = getMapCanvasData([inside, outside], passAll);

		expect(result.totalCount).toBe(2);
	});
});
