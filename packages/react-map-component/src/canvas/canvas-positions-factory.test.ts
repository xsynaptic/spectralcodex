import { describe, expect, test } from 'vitest';

import { findPointClusters, getClusterCandidates } from '#canvas/canvas-positions-factory.ts';

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

describe('findPointClusters', () => {
	const north = { id: 1 };
	const south = { id: 2 };
	const east = { id: 3 };

	const leavesByCluster = new Map<number, Array<string>>([
		[east.id, []],
		[north.id, ['shrine']],
		[south.id, ['theater', 'mine']],
	]);

	function createLookup({ failingId }: { failingId?: number } = {}) {
		const asked: Array<number> = [];

		return {
			asked,
			getLeafIds: ({ id }: { id: number }) => {
				asked.push(id);

				if (id === failingId) return Promise.reject(new Error('cluster gone'));

				return Promise.resolve(new Set<unknown>(leavesByCluster.get(id)));
			},
		};
	}

	test('a Point in its closest cluster is found without asking the next one', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findPointClusters(
			[{ candidates: [north, south], id: 'shrine' }],
			getLeafIds,
		);

		expect(clusters).toEqual(new Map([['shrine', north]]));
		expect(asked).toEqual([north.id]);
	});

	test('a Point missing from its closest cluster is looked for in the next closest', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findPointClusters(
			[{ candidates: [east, north, south], id: 'theater' }],
			getLeafIds,
		);

		expect(clusters).toEqual(new Map([['theater', south]]));
		expect(asked).toEqual([east.id, north.id, south.id]);
	});

	test('Points sharing a cluster ask it once', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findPointClusters(
			[
				{ candidates: [south], id: 'theater' },
				{ candidates: [south], id: 'mine' },
			],
			getLeafIds,
		);

		expect(clusters).toEqual(
			new Map([
				['mine', south],
				['theater', south],
			]),
		);
		expect(asked).toEqual([south.id]);
	});

	test('a Point in none of its candidates, or with none, yields nothing', async () => {
		const { getLeafIds } = createLookup();

		const clusters = await findPointClusters(
			[
				{ candidates: [east, north], id: 'theater' },
				{ candidates: [], id: 'mine' },
			],
			getLeafIds,
		);

		expect(clusters.size).toBe(0);
	});

	test('a failed lookup ends the search and keeps what was already found', async () => {
		const { getLeafIds } = createLookup({ failingId: east.id });

		const clusters = await findPointClusters(
			[
				{ candidates: [north], id: 'shrine' },
				{ candidates: [south, east], id: 'temple' },
			],
			getLeafIds,
		);

		expect(clusters).toEqual(new Map([['shrine', north]]));
	});
});
