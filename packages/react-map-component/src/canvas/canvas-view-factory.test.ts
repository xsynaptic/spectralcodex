import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import {
	getTargetBounds,
	getTargetPositions,
	getTargetZoom,
	parseMapView,
} from '#canvas/canvas-view-factory.ts';

function makeItem(id: string, geometry: MapSourceItem['geometry']) {
	return { geometry, properties: { id } } as MapSourceItem;
}

const items = [
	makeItem('theater', { coordinates: [121.8, 24.6], type: GeometryTypeEnum.Point }),
	makeItem('railway', {
		coordinates: [
			[121, 24],
			[122, 25],
		],
		type: GeometryTypeEnum.LineString,
	}),
	makeItem('temple', { coordinates: [120.2, 23], type: GeometryTypeEnum.Point }),
];

describe('parseMapView', () => {
	test('a page with no view yields an empty one', () => {
		expect(parseMapView(undefined)).toEqual({});
		expect(parseMapView('')).toEqual({});
	});

	test('a Location view carries its Targets', () => {
		expect(parseMapView('{"targetIds":["theater","theater-1"]}')).toEqual({
			targetIds: ['theater', 'theater-1'],
		});
	});

	test('a Region view carries its Scope, bounds and Division', () => {
		const view = {
			apiDivisionUrl: '/api/divisions/tainan.fgb',
			bounds: [120, 22.8, 120.7, 23.5],
			scope: { interval: [12, 48], type: 'region' },
		};

		expect(parseMapView(JSON.stringify(view))).toEqual(view);
	});

	test('fields the map does not take from a host are dropped', () => {
		expect(parseMapView('{"targetIds":["theater"],"languages":["zh"]}')).toEqual({
			targetIds: ['theater'],
		});
	});

	test('text that is not JSON yields an empty view', () => {
		expect(parseMapView('theater theater-1')).toEqual({});
	});

	test('one malformed field voids the whole view', () => {
		expect(parseMapView('{"targetIds":"theater"}')).toEqual({});
		expect(parseMapView('{"targetIds":["theater"],"scope":{"type":"region"}}')).toEqual({});
	});
});

describe('getTargetPositions', () => {
	test('collects point and line vertices of Targets only', () => {
		expect(getTargetPositions(items, ['theater', 'railway'])).toEqual([
			[121.8, 24.6],
			[121, 24],
			[122, 25],
		]);
	});

	test('an unknown Target yields nothing', () => {
		expect(getTargetPositions(items, ['missing'])).toEqual([]);
	});
});

describe('getTargetBounds', () => {
	test('no positions yields no bounds', () => {
		expect(getTargetBounds([])).toBeUndefined();
	});

	test('several positions yield the box around all of them', () => {
		expect(
			getTargetBounds([
				[121.8, 24.6],
				[121, 25],
				[122, 24],
			]),
		).toEqual([
			[121, 24],
			[122, 25],
		]);
	});
});

describe('getTargetZoom', () => {
	test('a zoom that already shows everything is kept', () => {
		expect(getTargetZoom(13, 16)).toBe(13);
	});

	test('a zoom too close to show everything pulls back to the fit', () => {
		expect(getTargetZoom(16, 13.5)).toBe(13.5);
		expect(getTargetZoom(11, 10)).toBe(10);
	});

	test('a far-out zoom pulls in, never past the fit', () => {
		expect(getTargetZoom(8, 19)).toBe(15);
		expect(getTargetZoom(8, 10)).toBe(10);
	});

	test('a single point, which fits at any zoom, stops at the maximum', () => {
		expect(getTargetZoom(19, 22)).toBe(17);
	});
});
