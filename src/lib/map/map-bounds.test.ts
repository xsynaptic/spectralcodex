import { describe, expect, test } from 'vitest';

import type { MapFeatureCollection } from '#lib/map/map-types.ts';

import { getMapBounds } from '#lib/map/map-bounds.ts';

function makeFeature(id: string, lng: number, lat: number, outlier?: boolean) {
	return {
		type: 'Feature' as const,
		id,
		properties: { title: id, ...(outlier === undefined ? {} : { outlier }) },
		geometry: { type: 'Point' as const, coordinates: [lng, lat] },
	};
}

function makeCollection(features: Array<ReturnType<typeof makeFeature>>): MapFeatureCollection {
	return { type: 'FeatureCollection', features } as unknown as MapFeatureCollection;
}

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

describe('getMapBounds', () => {
	test('returns undefined for missing, empty, or all-outlier input', () => {
		expect(getMapBounds({ featureCollection: undefined })).toBeUndefined();
		expect(getMapBounds({ featureCollection: makeCollection([]) })).toBeUndefined();
		expect(
			getMapBounds({ featureCollection: makeCollection([makeFeature('far', 150, 50, true)]) }),
		).toBeUndefined();
	});

	test('single point: bounds pad by the 1km minimum, limits by the 10km minimum', () => {
		const result = getMapBounds({
			featureCollection: makeCollection([makeFeature('temple', 121.5, 25)]),
		});

		expect(result).toBeDefined();
		expect(result!.center).toEqual([121.5, 25]);

		// 1km at lat 25: lat pad lengthToDegrees(1), lng pad widened by 1/cos(25 deg)
		expect(result!.bounds[0]).toBeCloseTo(121.490077, 5);
		expect(result!.bounds[1]).toBeCloseTo(24.991007, 5);
		expect(result!.bounds[2]).toBeCloseTo(121.509923, 5);
		expect(result!.bounds[3]).toBeCloseTo(25.008993, 5);

		// 10km pan limit
		expect(result!.maxBounds[0]).toBeCloseTo(121.400771, 5);
		expect(result!.maxBounds[1]).toBeCloseTo(24.910068, 5);
		expect(result!.maxBounds[2]).toBeCloseTo(121.599229, 5);
		expect(result!.maxBounds[3]).toBeCloseTo(25.089932, 5);
	});

	test('multi-point percentage buffers: inputs contained, maxBounds strictly wider', () => {
		const points: Array<[string, number, number]> = [
			['a', 121, 24],
			['b', 122, 25],
			['c', 121.4, 24.7],
		];
		const result = getMapBounds({
			featureCollection: makeCollection(points.map(([id, lng, lat]) => makeFeature(id, lng, lat))),
		});

		expect(result).toBeDefined();

		for (const [, lng, lat] of points) {
			expectWithinBounds(result!.bounds, lng, lat);
			expectWithinBounds(result!.maxBounds, lng, lat);
		}

		// Default 10% frame vs 100% pan limit
		expect(result!.maxBounds[0]).toBeLessThan(result!.bounds[0]);
		expect(result!.maxBounds[1]).toBeLessThan(result!.bounds[1]);
		expect(result!.maxBounds[2]).toBeGreaterThan(result!.bounds[2]);
		expect(result!.maxBounds[3]).toBeGreaterThan(result!.bounds[3]);

		// Center of extent
		expect(result!.center).toEqual([121.5, 24.5]);
	});

	test('outliers are excluded from center, bounds, and limits', () => {
		const result = getMapBounds({
			featureCollection: makeCollection([
				makeFeature('a', 121, 24),
				makeFeature('b', 121.1, 24.1),
				makeFeature('far', 150, 50, true),
			]),
		});

		expect(result).toBeDefined();
		expectWithinBounds(result!.bounds, 121, 24);
		expectWithinBounds(result!.bounds, 121.1, 24.1);
		expect(result!.bounds[2]).toBeLessThan(150);
		expect(result!.bounds[3]).toBeLessThan(50);
		expect(result!.maxBounds[2]).toBeLessThan(150);
		expect(result!.maxBounds[3]).toBeLessThan(50);
	});

	test('targetId centers on the target while bounds still span the collection', () => {
		const result = getMapBounds({
			featureCollection: makeCollection([makeFeature('a', 121, 24), makeFeature('b', 122, 25)]),
			targetId: 'b',
		});

		expect(result).toBeDefined();
		expect(result!.center).toEqual([122, 25]);
		expectWithinBounds(result!.bounds, 121, 24);
		expectWithinBounds(result!.bounds, 122, 25);
	});

	test('explicit buffers override the computed radius', () => {
		const result = getMapBounds({
			featureCollection: makeCollection([makeFeature('temple', 121.5, 25)]),
			boundsBuffer: 100,
		});

		// 100km at lat 25: lat pad lengthToDegrees(100)
		expect(result!.bounds[1]).toBeCloseTo(24.10068, 5);
		expect(result!.bounds[3]).toBeCloseTo(25.89932, 5);
	});
});
