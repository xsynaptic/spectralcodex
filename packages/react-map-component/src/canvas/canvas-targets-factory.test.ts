import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import {
	getTargetBounds,
	getTargetPositions,
	getTargetZoom,
	parseTargetIds,
} from '#canvas/canvas-targets-factory.ts';

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

describe('parseTargetIds', () => {
	test('an empty or blank attribute yields no Targets', () => {
		expect(parseTargetIds('')).toEqual([]);
		expect(parseTargetIds('  ')).toEqual([]);
	});

	test('ids are split on any whitespace', () => {
		expect(parseTargetIds('theater  theater-1\ntemple')).toEqual([
			'theater',
			'theater-1',
			'temple',
		]);
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
