import fc from 'fast-check';
import { describe, expect, test } from 'vitest';

import { assignChunks } from '#directory/map-chunks.ts';

type ChunkInputItem = Parameters<typeof assignChunks>[0][number];

function itemsForChunk(
	ids: Array<string>,
	byId: Map<string, ChunkInputItem>,
): Array<ChunkInputItem> {
	return ids.map((id) => byId.get(id)!);
}

function makeItem(id: string, [lng, lat]: [number, number], popupBytes = 10): ChunkInputItem {
	return { id, lat, lng, popupBytes };
}

// Ids are entry slugs; canonically equivalent Unicode ids would tie under localeCompare
const itemsArbitrary = fc.uniqueArray(
	fc.record({
		id: fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/),
		lat: fc.double({ max: 120, min: -120, noNaN: true }),
		lng: fc.double({ max: 400, min: -400, noNaN: true }),
		popupBytes: fc.integer({ max: 40, min: 1 }),
	}),
	{ maxLength: 60, selector: (item) => item.id },
);

const capArbitrary = fc.integer({ max: 200, min: 2 });

function compareIds(first: string, second: string) {
	return first.localeCompare(second);
}

// Mirror of the packer's byte accounting: brackets + items + comma separators
function payloadBytes(items: Array<ChunkInputItem>): number {
	const sum = items.reduce((total, item) => total + item.popupBytes, 0);
	return 2 + sum + Math.max(0, items.length - 1);
}

const gridSide = 4;

function gridCellItems(): Array<ChunkInputItem> {
	const items: Array<ChunkInputItem> = [];

	for (let x = 0; x < gridSide; x++) {
		for (let y = 0; y < gridSide; y++) {
			const lng = (360 / gridSide) * (x + 0.5) - 180;
			const lat = 90 - (180 / gridSide) * (y + 0.5);

			items.push(makeItem(`cell-${String(x)}-${String(y)}`, [lng, lat], 200));
		}
	}

	return items;
}

function gridCellOf(id: string): { x: number; y: number } {
	const [, x, y] = id.split('-', 3);

	return { x: Number(x), y: Number(y) };
}

describe('assignChunks', () => {
	test('keeps everything in one bin when under the cap', () => {
		const items = [makeItem('a', [121, 25]), makeItem('b', [-73, 45])];

		const { chunkIds, chunkKeyById } = assignChunks(items, { capBytes: 1000 });

		expect([...chunkIds.keys()]).toEqual(['0']);
		expect(chunkKeyById.get('a')).toBe('0');
		expect(chunkKeyById.get('b')).toBe('0');
		expect(chunkIds.get('0')).toEqual(['a', 'b']);
	});

	test('every item lands in one bin, and only a lone item exceeds the cap', () => {
		fc.assert(
			fc.property(itemsArbitrary, capArbitrary, (items, capBytes) => {
				const byId = new Map(items.map((item) => [item.id, item] as const));
				const { chunkIds, chunkKeyById } = assignChunks(items, { capBytes });

				expect([...chunkIds.values()].flat().toSorted(compareIds)).toEqual(
					[...byId.keys()].toSorted(compareIds),
				);

				for (const [key, ids] of chunkIds) {
					expect(ids.every((id) => chunkKeyById.get(id) === key)).toBe(true);

					if (ids.length > 1) {
						expect(payloadBytes(itemsForChunk(ids, byId))).toBeLessThanOrEqual(capBytes);
					}
				}
			}),
		);
	});

	test('isolates a lone item larger than the cap in its own bin', () => {
		const items = [
			makeItem('small-1', [100, 10], 40),
			makeItem('huge', [101, 11], 5000),
			makeItem('small-2', [102, 12], 40),
		];

		const { chunkIds, chunkKeyById } = assignChunks(items, { capBytes: 100 });

		const hugeKey = chunkKeyById.get('huge')!;
		expect(chunkIds.get(hugeKey)).toEqual(['huge']);
		expect(chunkKeyById.get('small-1')).not.toBe(hugeKey);
		expect(chunkKeyById.get('small-2')).not.toBe(hugeKey);
	});

	test('is deterministic regardless of input order', () => {
		const itemsAndShuffled = itemsArbitrary.chain((items) =>
			fc.tuple(
				fc.constant(items),
				fc.shuffledSubarray(items, { maxLength: items.length, minLength: items.length }),
			),
		);

		fc.assert(
			fc.property(itemsAndShuffled, capArbitrary, ([items, shuffled], capBytes) => {
				expect([...assignChunks(shuffled, { capBytes }).chunkIds]).toEqual([
					...assignChunks(items, { capBytes }).chunkIds,
				]);
			}),
		);
	});

	test('bins walk the world one grid cell at a time', () => {
		const items = gridCellItems();
		const { chunkIds } = assignChunks(items.toReversed(), { capBytes: 100 });

		const visited = [...chunkIds.values()].map((ids) => gridCellOf(ids[0]!));

		expect(visited).toHaveLength(gridSide * gridSide);

		for (let index = 1; index < visited.length; index++) {
			const previous = visited[index - 1]!;
			const current = visited[index]!;
			const step = Math.abs(current.x - previous.x) + Math.abs(current.y - previous.y);

			expect(step, `${String(index - 1)} to ${String(index)}`).toBe(1);
		}
	});
});

describe('assignChunks byte cap', () => {
	test.each([
		[2, 183, ['0']],
		[2, 182, ['0', '1']],
		[3, 274, ['0']],
		[3, 273, ['0', '1']],
	])(
		'%i items under a %i byte cap count the brackets and every comma between them',
		(itemCount, capBytes, expected) => {
			const items = Array.from({ length: itemCount }, (_, index) =>
				makeItem(`p${String(index)}`, [121 + index * 0.001, 25 + index * 0.001], 90),
			);

			expect([...assignChunks(items, { capBytes }).chunkIds.keys()]).toEqual(expected);
		},
	);

	test('empty input yields empty maps', () => {
		const { chunkIds, chunkKeyById } = assignChunks([]);

		expect(chunkIds.size).toBe(0);
		expect(chunkKeyById.size).toBe(0);
	});

	test('an out-of-range coordinate packs exactly as the clamped edge does', () => {
		const spread = Array.from({ length: 8 }, (_, index) =>
			makeItem(`s${String(index)}`, [-140 + index * 40, -60 + index * 15], 40),
		);

		const assignments = (probe: ChunkInputItem) => [
			...assignChunks([probe, ...spread], { capBytes: 83 }).chunkKeyById,
		];

		expect(assignments(makeItem('probe', [-999, 999], 40))).toEqual(
			assignments(makeItem('probe', [-180, 90], 40)),
		);
		expect(assignments(makeItem('probe', [999, -999], 40))).toEqual(
			assignments(makeItem('probe', [180, -90], 40)),
		);
	});
});
