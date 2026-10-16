import type { MapSourceItem } from '@spectralcodex/map-codec';

import { GeometryTypeEnum } from '@spectralcodex/shared/map';
import { describe, expect, test } from 'vitest';

import {
	findTargetClusters,
	getClusterCandidates,
	getTargetPoints,
} from '#targets/targets-markers-factory.ts';

function makeItem(id: string, coordinates: [number, number]) {
	return {
		geometry: { coordinates, type: GeometryTypeEnum.Point },
		properties: { id },
	} as MapSourceItem;
}

describe('getTargetPoints', () => {
	const items = [
		makeItem('theater', [121.8, 24.6]),
		makeItem('railway', [121, 24]),
		makeItem('temple', [120.2, 23]),
	];

	test('yields the Targets only, in Target order', () => {
		expect(getTargetPoints(items, ['railway', 'theater'])).toEqual([
			{ coordinates: [121, 24], id: 'railway' },
			{ coordinates: [121.8, 24.6], id: 'theater' },
		]);
	});

	test('an unknown Target yields nothing', () => {
		expect(getTargetPoints(items, ['missing'])).toEqual([]);
	});
});

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

		const clusters = await findTargetClusters(
			[{ candidates: [north, south], id: 'shrine' }],
			getLeafIds,
		);

		expect(clusters).toEqual([north]);
		expect(asked).toEqual([north.id]);
	});

	test('a Target missing from its closest cluster is looked for in the next closest', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findTargetClusters(
			[{ candidates: [east, north, south], id: 'theater' }],
			getLeafIds,
		);

		expect(clusters).toEqual([south]);
		expect(asked).toEqual([east.id, north.id, south.id]);
	});

	test('Targets sharing a cluster ask it once and yield it once', async () => {
		const { asked, getLeafIds } = createLookup();

		const clusters = await findTargetClusters(
			[
				{ candidates: [south], id: 'theater' },
				{ candidates: [south], id: 'mine' },
			],
			getLeafIds,
		);

		expect(clusters).toEqual([south]);
		expect(asked).toEqual([south.id]);
	});

	test('a Target in none of its candidates, or with none, yields nothing', async () => {
		const { getLeafIds } = createLookup();

		const clusters = await findTargetClusters(
			[
				{ candidates: [east, north], id: 'theater' },
				{ candidates: [], id: 'mine' },
			],
			getLeafIds,
		);

		expect(clusters).toEqual([]);
	});

	test('a failed lookup ends the search and keeps what was already found', async () => {
		const { getLeafIds } = createLookup({ failingId: east.id });

		const clusters = await findTargetClusters(
			[
				{ candidates: [north], id: 'shrine' },
				{ candidates: [south, east], id: 'temple' },
			],
			getLeafIds,
		);

		expect(clusters).toEqual([north]);
	});

	test('the candidate lists passed in lists are left as they were', async () => {
		const { getLeafIds } = createLookup();
		const candidates = [east, south];

		await findTargetClusters([{ candidates, id: 'theater' }], getLeafIds);

		expect(candidates).toEqual([east, south]);
	});
});
