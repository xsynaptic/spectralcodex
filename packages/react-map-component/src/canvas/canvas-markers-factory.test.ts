import { describe, expect, test } from 'vitest';

import { getClusterCandidates } from '#canvas/canvas-markers-factory.ts';

describe('getClusterCandidates', () => {
	const clusters = [
		{ id: 'far', x: 100, y: 0 },
		{ id: 'near', x: 0, y: 10 },
		{ id: 'edge', x: 30, y: 40 },
		{ id: 'outside', x: 30, y: 41 },
	];

	test('clusters inside the radius come back nearest first', () => {
		expect(getClusterCandidates({ x: 0, y: 0 }, clusters, 50).map(({ id }) => id)).toEqual([
			'near',
			'edge',
		]);
		expect(getClusterCandidates({ x: 90, y: 0 }, clusters, 100).map(({ id }) => id)).toEqual([
			'far',
			'edge',
			'outside',
			'near',
		]);
	});

	test('a point with no cluster in reach has no candidates', () => {
		expect(getClusterCandidates({ x: 500, y: 500 }, clusters, 50)).toEqual([]);
	});
});
