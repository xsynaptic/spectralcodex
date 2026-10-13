import { describe, expect, test } from 'vitest';

import { findTargetClusters, getClusterCandidates } from '#targets/targets-markers-factory.ts';

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

describe('findTargetClusters', () => {
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

	test('a Target in its closest cluster is found without asking the next one', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findTargetClusters({
			getLeafIds,
			isCurrent: () => true,
			leafIds: new Map(),
			pending: [{ candidates: [north, south], id: 'shrine' }],
		});

		expect(clusters).toEqual([north]);
		expect(asked).toEqual([north.id]);
	});

	test('a Target missing from its closest cluster is looked for in the next closest', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findTargetClusters({
			getLeafIds,
			isCurrent: () => true,
			leafIds: new Map(),
			pending: [{ candidates: [east, north, south], id: 'theater' }],
		});

		expect(clusters).toEqual([south]);
		expect(asked).toEqual([east.id, north.id, south.id]);
	});

	test('Targets sharing a cluster ask it once and yield it once', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findTargetClusters({
			getLeafIds,
			isCurrent: () => true,
			leafIds: new Map(),
			pending: [
				{ candidates: [south], id: 'theater' },
				{ candidates: [south], id: 'mine' },
			],
		});

		expect(clusters).toEqual([south]);
		expect(asked).toEqual([south.id]);
	});

	test('a cluster asked by an earlier call is not asked again', async () => {
		const { asked, getLeafIds } = createLookup();
		const leafIds = new Map<number, Set<unknown>>();
		const pending = [{ candidates: [south], id: 'theater' }];

		await findTargetClusters({ getLeafIds, isCurrent: () => true, leafIds, pending });

		const clusters = await findTargetClusters({
			getLeafIds,
			isCurrent: () => true,
			leafIds,
			pending,
		});

		expect(clusters).toEqual([south]);
		expect(asked).toEqual([south.id]);
	});

	test('a Target in none of its candidates, or with none, yields nothing', async () => {
		const { getLeafIds } = createLookup();

		const clusters = await findTargetClusters({
			getLeafIds,
			isCurrent: () => true,
			leafIds: new Map(),
			pending: [
				{ candidates: [east, north], id: 'theater' },
				{ candidates: [], id: 'mine' },
			],
		});

		expect(clusters).toEqual([]);
	});

	test('a search that is no longer current stops asking', async () => {
		const { asked, getLeafIds } = createLookup();
		let rounds = 0;

		const clusters = await findTargetClusters({
			getLeafIds,
			isCurrent: () => {
				rounds += 1;

				return rounds === 1;
			},
			leafIds: new Map(),
			pending: [{ candidates: [east, south], id: 'theater' }],
		});

		expect(clusters).toEqual([]);
		expect(asked).toEqual([east.id]);
	});

	test('a failed lookup ends the search and keeps what was already found', async () => {
		const { getLeafIds } = createLookup({ failingId: east.id });

		const clusters = await findTargetClusters({
			getLeafIds,
			isCurrent: () => true,
			leafIds: new Map(),
			pending: [
				{ candidates: [north], id: 'shrine' },
				{ candidates: [south, east], id: 'temple' },
			],
		});

		expect(clusters).toEqual([north]);
	});

	test('the candidate lists passed in lists are left as they were', async () => {
		const { getLeafIds } = createLookup();
		const candidates = [east, south];

		await findTargetClusters({
			getLeafIds,
			isCurrent: () => true,
			leafIds: new Map(),
			pending: [{ candidates, id: 'theater' }],
		});

		expect(candidates).toEqual([east, south]);
	});
});
