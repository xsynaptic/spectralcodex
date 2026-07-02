import { describe, expect, test } from 'vitest';

import type { ChunkInputItem } from '#lib/map/map-chunks.ts';

import { assignChunks } from '#lib/map/map-chunks.ts';

function makeItem(id: string, lng: number, lat: number, popupBytes = 10): ChunkInputItem {
	return { id, lng, lat, popupBytes };
}

describe('assignChunks', () => {
	test('keeps everything in the root cell when under the cap', () => {
		const items = [makeItem('a', 121, 25), makeItem('b', -73, 45)];

		const { chunkKeyById, chunkIds } = assignChunks(items, { capBytes: 1000 });

		expect(chunkKeyById.get('a')).toBe('0-0-0');
		expect(chunkKeyById.get('b')).toBe('0-0-0');
		expect([...chunkIds.keys()]).toEqual(['0-0-0']);
		expect(chunkIds.get('0-0-0')).toEqual(['a', 'b']);
	});

	test('splits the root when the payload exceeds the cap and separates by hemisphere', () => {
		// Two far-apart points, each large enough that together they exceed the cap
		const items = [makeItem('east', 121, 25, 200), makeItem('west', -73, 45, 200)];

		const { chunkKeyById } = assignChunks(items, { capBytes: 300 });

		// East (lng 121 > 0) and west (lng -73 < 0) fall into different z=1 columns
		expect(chunkKeyById.get('east')).toBe('1-1-0');
		expect(chunkKeyById.get('west')).toBe('1-0-0');
	});

	test('recurses deeper for spread-out points until each cell fits', () => {
		// Points spread widely enough to separate at moderate zoom
		const items = Array.from({ length: 8 }, (_, index) =>
			makeItem(`p${String(index)}`, -140 + index * 40, -60 + index * 15, 100),
		);

		const { chunkKeyById, chunkIds } = assignChunks(items, { capBytes: 250 });

		// Every item is assigned and each resulting chunk is within the cap (at most two 100-byte items)
		expect(chunkKeyById.size).toBe(8);
		for (const [, ids] of chunkIds) {
			const bytes = 2 + ids.length * 100 + Math.max(0, ids.length - 1);
			expect(bytes).toBeLessThanOrEqual(250);
		}
	});

	test('stops at maxDepth even when coincident points cannot be separated', () => {
		const items = Array.from({ length: 4 }, (_, index) =>
			makeItem(`same${String(index)}`, 120, 24, 500),
		);

		const { chunkKeyById, chunkIds } = assignChunks(items, { capBytes: 100, maxDepth: 3 });

		// All share one coordinate, so they land together in a single deepest cell
		expect(new Set(chunkKeyById.values()).size).toBe(1);
		const [key] = [...chunkIds.keys()];
		expect(key?.startsWith('3-')).toBe(true);
	});

	test('clamps out-of-range coordinates into the grid', () => {
		const items = [makeItem('edge', 180, -90), makeItem('corner', -180, 90)];

		const { chunkKeyById } = assignChunks(items, { capBytes: 1000 });

		expect(chunkKeyById.get('edge')).toBe('0-0-0');
		expect(chunkKeyById.get('corner')).toBe('0-0-0');
	});
});
