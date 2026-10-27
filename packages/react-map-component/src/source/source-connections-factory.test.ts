import { describe, expect, test } from 'vitest';

import type { ClusterPosition } from '#lib/clusters-factory.ts';

import { makeMapSourceItem } from '#lib/map-test-utils.ts';
import { getConnectionCollection, getConnections } from '#source/source-connections-factory.ts';

const rows = [
	makeMapSourceItem({ backlinks: ['shrine', 'theater'], id: 'temple:0' }, [120, 23]),
	makeMapSourceItem({ id: 'temple:1' }, [120.01, 23]),
	makeMapSourceItem({ id: 'temple:10' }, [120.03, 23]),
	makeMapSourceItem({ id: 'temple:2' }, [120.02, 23.02]),
	makeMapSourceItem({ backlinks: ['mine', 'temple:0'], id: 'shrine' }, [120.1, 23]),
	makeMapSourceItem({ id: 'theater' }, [120.2, 23]),
	makeMapSourceItem({ id: 'mine' }, [120.3, 23]),
];

function getPairs(subjectId: string | undefined, visibleRows = rows) {
	return getConnections(visibleRows, subjectId).map(({ from, kind, to }) => [from.id, kind, to.id]);
}

describe('getConnections', () => {
	test('Points join by their shortest lines, and links meet the first Point', () => {
		expect(getPairs('temple:2')).toEqual([
			['temple:0', 'points', 'temple:1'],
			['temple:1', 'points', 'temple:10'],
			['temple:1', 'points', 'temple:2'],
			['shrine', 'link', 'temple:0'],
			['theater', 'link', 'temple:0'],
		]);
	});

	test('a link written both ways draws one line', () => {
		expect(getPairs('shrine')).toEqual([
			['shrine', 'link', 'temple:0'],
			['mine', 'link', 'shrine'],
		]);
	});

	test('links between other Locations, or to a Point off the canvas, are left out', () => {
		const visible = rows.filter(({ properties }) => properties.id !== 'temple:0');

		expect(getPairs('theater')).toEqual([['theater', 'link', 'temple:0']]);
		expect(getPairs('theater', visible)).toEqual([]);
	});
});

function clusterAt(clusterId: number, coordinates: [number, number]): ClusterPosition {
	return { clusterId, coordinates };
}

describe('getConnectionCollection', () => {
	test('ends in the same cluster draw nothing', () => {
		const cluster = clusterAt(7, [120.01, 23]);
		const positions = new Map([
			['temple:0', cluster],
			['temple:1', cluster],
			['temple:2', cluster],
			['temple:10', cluster],
		]);
		const { features } = getConnectionCollection(getConnections(rows, 'temple:0'), positions);

		expect(features.map(({ properties }) => properties.kind)).toEqual(['link', 'link']);
	});

	test('links into one cluster draw one line to the cluster', () => {
		const cluster = clusterAt(3, [120.15, 23]);
		const positions = new Map([
			['shrine', cluster],
			['theater', cluster],
		]);
		const { features } = getConnectionCollection(getConnections(rows, 'temple:0'), positions);
		const links = features.filter(({ properties }) => properties.kind === 'link');

		expect(links).toHaveLength(1);
		expect(links[0]?.geometry.coordinates.at(0)?.[0]).toBeCloseTo(120.15);
	});

	test('a link merged into a line between Points draws as the Points line', () => {
		const cluster = clusterAt(5, [120.05, 23]);
		const positions = new Map([
			['shrine', cluster],
			['temple:1', cluster],
		]);
		const { features } = getConnectionCollection(getConnections(rows, 'temple:0'), positions);

		expect(features.map(({ properties }) => properties.kind)).toEqual([
			'points',
			'points',
			'points',
			'link',
		]);
	});
});
