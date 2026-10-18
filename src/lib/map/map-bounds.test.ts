import type { MapSourceItem } from '@spectralcodex/map-codec';

import { describe, expect, test } from 'vitest';

import { getMapBounds } from '#lib/map/map-bounds.ts';

function expectWithinBounds(
	bounds: [number, number, number, number],
	lng: number,
	lat: number,
): void {
	expect(lng).toBeGreaterThanOrEqual(bounds[0]);
	expect(lat).toBeGreaterThanOrEqual(bounds[1]);
	expect(lng).toBeLessThanOrEqual(bounds[2]);
	expect(lat).toBeLessThanOrEqual(bounds[3]);
}

function makePoint(id: string, coordinates: [number, number], isOutlier?: boolean): MapSourceItem {
	return {
		geometry: { coordinates, type: 'Point' },
		properties: {
			entryQuality: 1,
			hasImage: false,
			id,
			precision: 5,
			rating: 1,
			status: 'unknown',
			title: id,
			...(isOutlier === undefined ? {} : { outlier: isOutlier }),
		},
		type: 'Feature',
	};
}

describe('getMapBounds', () => {
	test('returns undefined for missing, empty, or all-outlier input', () => {
		expect(getMapBounds([])).toBeUndefined();
		expect(getMapBounds([makePoint('far', [150, 50], true)])).toBeUndefined();
	});

	test('an outlier that is the target still frames its own map', () => {
		const result = getMapBounds(
			[makePoint('far', [150, 50], true), makePoint('other', [10, 10], true)],
			{ targetId: 'far' },
		);

		expect(result).toBeDefined();
		expect(result!.center).toEqual([150, 50]);
		expectWithinBounds(result!.maxBounds, 150, 50);
		expect(result!.maxBounds[0]).toBeGreaterThan(10);
	});

	test('single point: bounds pad by the 1km minimum, limits by the 10km minimum', () => {
		const result = getMapBounds([makePoint('temple', [121.5, 25])]);

		expect(result).toBeDefined();
		expect(result!.center).toEqual([121.5, 25]);

		expectWithinBounds(result!.bounds, 121.5, 25);

		const [, south, , north] = result!.bounds;
		const [, limitSouth, , limitNorth] = result!.maxBounds;

		expect((limitNorth - limitSouth) / (north - south)).toBeCloseTo(10, 5);
	});

	test('multi-point percentage buffers: inputs contained, maxBounds strictly wider', () => {
		const points: Array<[string, number, number]> = [
			['a', 121, 24],
			['b', 122, 25],
			['c', 121.4, 24.7],
		];
		const result = getMapBounds(points.map(([id, lng, lat]) => makePoint(id, [lng, lat])));

		expect(result).toBeDefined();

		for (const [, lng, lat] of points) {
			expectWithinBounds(result!.bounds, lng, lat);
			expectWithinBounds(result!.maxBounds, lng, lat);
		}

		expect(result!.maxBounds[0]).toBeLessThan(result!.bounds[0]);
		expect(result!.maxBounds[1]).toBeLessThan(result!.bounds[1]);
		expect(result!.maxBounds[2]).toBeGreaterThan(result!.bounds[2]);
		expect(result!.maxBounds[3]).toBeGreaterThan(result!.bounds[3]);

		expect(result!.center).toEqual([121.5, 24.5]);
	});

	test('outliers are excluded from center, bounds, and limits', () => {
		const result = getMapBounds([
			makePoint('a', [121, 24]),
			makePoint('b', [121.1, 24.1]),
			makePoint('far', [150, 50], true),
		]);

		expect(result).toBeDefined();
		expectWithinBounds(result!.bounds, 121, 24);
		expectWithinBounds(result!.bounds, 121.1, 24.1);
		expect(result!.bounds[2]).toBeLessThan(150);
		expect(result!.bounds[3]).toBeLessThan(50);
		expect(result!.maxBounds[2]).toBeLessThan(150);
		expect(result!.maxBounds[3]).toBeLessThan(50);
	});

	test('the Target is framed and centered while the pan limit spans every row', () => {
		const result = getMapBounds([makePoint('a', [121, 24]), makePoint('b', [122, 25])], {
			targetId: 'b',
		});

		expect(result).toBeDefined();
		expect(result!.center).toEqual([122, 25]);
		expectWithinBounds(result!.bounds, 122, 25);
		expect(result!.bounds[0]).toBeGreaterThan(121);
		expectWithinBounds(result!.maxBounds, 121, 24);
	});

	test('every Point of a multi-point Target is framed', () => {
		const result = getMapBounds(
			[makePoint('a', [120, 23]), makePoint('b:0', [121, 24]), makePoint('b:1', [121.2, 24.2])],
			{ targetId: 'b' },
		);

		expect(result).toBeDefined();
		expectWithinBounds(result!.bounds, 121, 24);
		expectWithinBounds(result!.bounds, 121.2, 24.2);
		expect(result!.bounds[0]).toBeGreaterThan(120);
		expect(result!.center).toEqual([121.1, 24.1]);
	});

	test('a Location whose id extends the Target id is not framed as a Target', () => {
		const result = getMapBounds([makePoint('b', [121, 24]), makePoint('b-annex', [123, 26])], {
			targetId: 'b',
		});

		expect(result).toBeDefined();
		expect(result!.center).toEqual([121, 24]);
	});

	test('explicit buffers override the computed radius', () => {
		const result = getMapBounds([makePoint('temple', [121.5, 25])], { boundsBuffer: 100 });

		expect(result!.bounds[1]).toBeCloseTo(24.10068, 5);
		expect(result!.bounds[3]).toBeCloseTo(25.89932, 5);
	});
});

describe('getMapBounds at world scale', () => {
	test('a set crossing the antimeridian frames across the Pacific, not around the world', () => {
		const result = getMapBounds([makePoint('fiji', [175, -15]), makePoint('samoa', [-165, -10])]);

		expect(result).toBeDefined();
		expect(result!.bounds[0]).toBeLessThan(175);
		expect(result!.bounds[2]).toBeGreaterThan(195);
		expect(result!.bounds[2] - result!.bounds[0]).toBeLessThan(60);
		expect(result!.center).toEqual([-175, -12.5]);
	});

	test('a pan limit padded past a full world clamps to one world', () => {
		const result = getMapBounds([
			makePoint('a', [-150, 0]),
			makePoint('b', [-30, 0]),
			makePoint('c', [90, 0]),
		]);

		expect(result).toBeDefined();
		expect(result!.maxBounds[0]).toBe(-180);
		expect(result!.maxBounds[2]).toBe(180);
	});
});
