import type { MapSourceItem } from '@spectralcodex/map-codec';

import { describe, expect, test } from 'vitest';

import { getMapBacklinksByRowId } from '#lib/map/map-backlinks.ts';

function rowAt(id: string, coordinates: [number, number]) {
	return {
		geometry: { coordinates, type: 'Point' },
		properties: {
			entryQuality: 1,
			hasImage: false,
			id,
			precision: 3,
			rating: 2,
			status: 'unknown',
			title: id,
		},
		type: 'Feature',
	} satisfies MapSourceItem;
}

// About 11 km per 0.1° of latitude
const directory = [
	rowAt('temple:0', [120, 23]),
	rowAt('temple:1', [120, 23.1]),
	rowAt('shrine', [120, 23.15]),
	rowAt('far', [120, 25]),
];

const firstRowIdByEntryId = new Map([
	['far', 'far'],
	['hidden', 'hidden'],
	['shrine', 'shrine'],
	['temple', 'temple:0'],
]);

function getBacklinks(backlinkIdsByEntryId: Record<string, Array<string>>) {
	return getMapBacklinksByRowId(directory, {
		backlinksOf: (id) =>
			(backlinkIdsByEntryId[id] ?? []).map((backlinkId) => ({
				collection: backlinkId === 'post' ? 'posts' : 'locations',
				id: backlinkId,
			})),
		distanceLimit: 100,
		firstRowIdByEntryId,
	});
}

describe('getMapBacklinksByRowId', () => {
	test('a multi-Point Location holds and appears in Backlinks by its first Point', () => {
		const backlinks = getBacklinks({ shrine: ['temple'], temple: ['shrine'] });

		expect([...backlinks]).toEqual([
			['shrine', ['temple:0']],
			['temple:0', ['shrine']],
		]);
	});

	test('drops Backlinks from far away, hidden or non-Location entries, and from itself', () => {
		const backlinks = getBacklinks({ shrine: ['far', 'hidden', 'post', 'shrine'] });

		expect(backlinks.size).toBe(0);
	});
});
