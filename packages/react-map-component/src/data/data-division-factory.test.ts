import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';

import { describe, expect, test } from 'vitest';

import { createFeatureMask, worldBounds } from '#data/data-division-factory.ts';

function square(west: number, south: number, size: number): Array<Position> {
	return [
		[west, south],
		[west + size, south],
		[west + size, south + size],
		[west, south + size],
		[west, south],
	];
}

function toFeature<T extends MultiPolygon | Polygon>(geometry: T): Feature<T> {
	return { geometry, properties: {}, type: 'Feature' };
}

function getBounds(ring: Array<Position>) {
	const longitudes = ring.map(([longitude = 0]) => longitude);
	const latitudes = ring.map(([, latitude = 0]) => latitude);

	return [
		Math.min(...longitudes),
		Math.min(...latitudes),
		Math.max(...longitudes),
		Math.max(...latitudes),
	];
}

describe('createFeatureMask', () => {
	test('cuts a polygon out of the world as a hole', () => {
		const mask = createFeatureMask(
			toFeature({ coordinates: [square(120, 22, 2)], type: 'Polygon' }),
		);

		expect(mask?.geometry.type).toBe('Polygon');

		const [outer = [], hole = [], ...rest] = mask?.geometry.coordinates as Array<Array<Position>>;

		expect(getBounds(outer)).toEqual(worldBounds);
		expect(getBounds(hole)).toEqual([120, 22, 122, 24]);
		expect(rest).toHaveLength(0);
	});

	test('cuts every part of a multipolygon', () => {
		const mask = createFeatureMask(
			toFeature({
				coordinates: [[square(100, 10, 1)], [square(120, 22, 2)]],
				type: 'MultiPolygon',
			}),
		);

		const [outer = [], ...holes] = mask?.geometry.coordinates as Array<Array<Position>>;

		expect(getBounds(outer)).toEqual(worldBounds);
		expect(holes.map((hole) => getBounds(hole)).toSorted(([a = 0], [b = 0]) => a - b)).toEqual([
			[100, 10, 101, 11],
			[120, 22, 122, 24],
		]);
	});

	test('returns nothing when the polygon covers the world', () => {
		const mask = createFeatureMask(
			toFeature({ coordinates: [square(-200, -100, 400)], type: 'Polygon' }),
		);

		expect(mask).toBeNull();
	});
});
