import { describe, expect, test } from 'vitest';

import {
	createClusterLocator,
	getClusterIndex,
	getPositionedPoint,
	pointClusterOptions,
} from '#lib/clusters-factory.ts';
import { makeMapSourceItem } from '#lib/map-test-utils.ts';

function makeRows() {
	const centers: Array<[number, number]> = [
		[100.5, 13.75],
		[100.52, 13.76],
		[98.98, 18.79],
		[121.5, 25.03],
		[139.69, 35.68],
	];
	let seed = 1;

	function random() {
		seed = (seed * 16_807) % 2_147_483_647;

		return seed / 2_147_483_647;
	}

	return Array.from({ length: 400 }, (_, position) => {
		const [longitude, latitude] = centers[position % centers.length] ?? [0, 0];
		const spread = 10 ** -(1 + (position % 4));

		return makeMapSourceItem({ id: `location-${String(position)}` }, [
			longitude + (random() - 0.5) * spread,
			latitude + (random() - 0.5) * spread,
		]);
	});
}

describe('createClusterLocator', () => {
	const rows = makeRows();
	const index = getClusterIndex(rows);
	const points = rows
		.filter((_, position) => position % 9 === 0)
		.map((row) => getPositionedPoint(row));

	function findHolder(id: string, zoom: number) {
		const everywhere = index.getClusters([-180, -85, 180, 85], zoom);

		for (const { geometry, properties } of everywhere) {
			const clusterId: unknown = properties?.cluster_id;

			if (typeof clusterId !== 'number') continue;

			const leaves = index.getLeaves(clusterId, Infinity);

			if (leaves.some((leaf) => leaf.properties?.id === id)) {
				return { clusterId, coordinates: geometry.coordinates };
			}
		}

		return;
	}

	test('every Point resolves to the cluster whose leaves hold it, whatever order the zooms come in', () => {
		const getClusterPositions = createClusterLocator(index, points);

		for (const zoom of [12, 3, 14, 0, 9, 6, 1, 13, 2, 4, 5, 7, 8, 10, 11]) {
			const positions = getClusterPositions(zoom);

			for (const { id } of points) {
				expect(positions.get(id)).toEqual(findHolder(id, zoom));
			}
		}
	});

	test('the fixture clusters every sampled Point at zoom 0, only some at the deepest, and none past it', () => {
		const getClusterPositions = createClusterLocator(index, points);

		expect(getClusterPositions(0).size).toBe(points.length);
		expect(getClusterPositions(pointClusterOptions.maxZoom).size).toBeLessThan(points.length);
		expect(getClusterPositions(pointClusterOptions.maxZoom + 1).size).toBe(0);
	});
});
