import { describe, expect, test } from 'vitest';

import type { ChunkInputItem } from '#lib/map/map-chunks.ts';

import { assignChunks } from '#lib/map/map-chunks.ts';

function makeItem(id: string, lng: number, lat: number, popupBytes = 10): ChunkInputItem {
	return { id, lng, lat, popupBytes };
}

// Mirror of the packer's byte accounting: brackets + items + comma separators
function payloadBytes(items: Array<ChunkInputItem>): number {
	const sum = items.reduce((total, item) => total + item.popupBytes, 0);
	return 2 + sum + Math.max(0, items.length - 1);
}

function itemsForChunk(
	ids: Array<string>,
	byId: Map<string, ChunkInputItem>,
): Array<ChunkInputItem> {
	return ids.map((id) => byId.get(id)!);
}

// Spread-out point set whose ids are permuted by seed, so different seeds feed the same
// items in a different input order
function makeSeededItems(seed: number): Array<ChunkInputItem> {
	return Array.from({ length: 30 }, (_, index) => {
		const id = `q${String((index * 7 + seed) % 30)}`;
		return makeItem(id, -150 + index * 10, -60 + ((index * 13) % 120), 80);
	});
}

describe('assignChunks', () => {
	test('keeps everything in one bin when under the cap', () => {
		const items = [makeItem('a', 121, 25), makeItem('b', -73, 45)];

		const { chunkKeyById, chunkIds } = assignChunks(items, { capBytes: 1000 });

		expect([...chunkIds.keys()]).toEqual(['0']);
		expect(chunkKeyById.get('a')).toBe('0');
		expect(chunkKeyById.get('b')).toBe('0');
		expect(chunkIds.get('0')).toEqual(['a', 'b']);
	});

	test('every bin stays within the cap and every item is assigned', () => {
		const byId = new Map<string, ChunkInputItem>();
		const items = Array.from({ length: 40 }, (_, index) => {
			const item = makeItem(`p${String(index)}`, -160 + index * 8, -70 + index * 3, 90);
			byId.set(item.id, item);
			return item;
		});

		const { chunkKeyById, chunkIds } = assignChunks(items, { capBytes: 250 });

		expect(chunkKeyById.size).toBe(40);
		let seen = 0;
		for (const [, ids] of chunkIds) {
			seen += ids.length;
			expect(payloadBytes(itemsForChunk(ids, byId))).toBeLessThanOrEqual(250);
		}
		expect(seen).toBe(40);
	});

	test('isolates a lone item larger than the cap in its own bin', () => {
		const items = [
			makeItem('small-1', 100, 10, 40),
			makeItem('huge', 101, 11, 5000),
			makeItem('small-2', 102, 12, 40),
		];

		const { chunkKeyById, chunkIds } = assignChunks(items, { capBytes: 100 });

		const hugeKey = chunkKeyById.get('huge')!;
		expect(chunkIds.get(hugeKey)).toEqual(['huge']);
		expect(chunkKeyById.get('small-1')).not.toBe(hugeKey);
		expect(chunkKeyById.get('small-2')).not.toBe(hugeKey);
	});

	test('is deterministic regardless of input order', () => {
		const byId = (result: ReturnType<typeof assignChunks>) =>
			[...result.chunkKeyById].sort((a, b) => a[0].localeCompare(b[0]));

		const forward = assignChunks(makeSeededItems(0), { capBytes: 300 });
		const shuffled = assignChunks(makeSeededItems(0).toReversed(), { capBytes: 300 });

		expect(byId(shuffled)).toEqual(byId(forward));
	});

	test('keeps geographically distant clusters spatially coherent', () => {
		// Two tight clusters on opposite sides of the world; next-fit may straddle at most one
		// boundary bin, but must not scatter either cluster or interleave the two
		const east = Array.from({ length: 5 }, (_, index) =>
			makeItem(`east-${String(index)}`, 121 + index * 0.01, 25 + index * 0.01, 40),
		);
		const west = Array.from({ length: 5 }, (_, index) =>
			makeItem(`west-${String(index)}`, -73 + index * 0.01, 45 + index * 0.01, 40),
		);

		const { chunkKeyById } = assignChunks([...east, ...west], { capBytes: 250 });

		const eastKeys = new Set(east.map((item) => chunkKeyById.get(item.id)));
		const westKeys = new Set(west.map((item) => chunkKeyById.get(item.id)));
		expect(eastKeys.intersection(westKeys).size).toBeLessThanOrEqual(1);
	});

	test('clamps out-of-range coordinates without throwing', () => {
		const items = [makeItem('edge', 999, -999), makeItem('corner', -999, 999)];

		const { chunkKeyById } = assignChunks(items, { capBytes: 1000 });

		expect(chunkKeyById.size).toBe(2);
	});
});
