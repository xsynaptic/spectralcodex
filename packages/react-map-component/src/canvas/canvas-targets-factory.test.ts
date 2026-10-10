import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import {
	getTargetCamera,
	getTargetPositions,
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

describe('getTargetCamera', () => {
	test('no positions yields no camera', () => {
		expect(getTargetCamera([], 14)).toBeUndefined();
	});

	test('a single point keeps a zoom inside the range', () => {
		expect(getTargetCamera([[121.8, 24.6]], 14)).toEqual({
			center: [121.8, 24.6],
			type: 'center',
			zoom: 14,
		});
	});

	test('a single point pulls in from far out and back from too close', () => {
		expect(getTargetCamera([[121.8, 24.6]], 8)).toMatchObject({ zoom: 15 });
		expect(getTargetCamera([[121.8, 24.6]], 19)).toMatchObject({ zoom: 17 });
	});

	test('several positions yield the box around all of them', () => {
		expect(
			getTargetCamera(
				[
					[121.8, 24.6],
					[121, 25],
					[122, 24],
				],
				14,
			),
		).toMatchObject({
			bounds: [
				[121, 24],
				[122, 25],
			],
			type: 'bounds',
		});
	});

	test('coincident positions are centred, not fitted to an empty box', () => {
		expect(
			getTargetCamera(
				[
					[121.8, 24.6],
					[121.8, 24.6],
				],
				14,
			),
		).toMatchObject({ type: 'center' });
	});
});
