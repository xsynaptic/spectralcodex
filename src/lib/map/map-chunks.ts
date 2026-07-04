/**
 * Bin-packs popup payloads into size-bounded chunks
 * This is done by walking a Hilbert curve over world lon/lat and greedily filling each bin to a byte cap
 * The Hilbert order preserves spatial locality, so each bin is roughly contiguous
 * Keys are sequential integers, renumbered every build
 * Chunk URLs are version-busted client-side, so stable geographic keys buy nothing
 */

const chunkBytesLimitKb = 150 * 1024;

// Hilbert grid side is 2**ORDER; order 16 resolves the globe to ~600m at the equator, ample for packing
const hilbertOrder = 16;
const hilbertSide = 2 ** hilbertOrder;

export interface ChunkInputItem {
	id: string;
	lng: number;
	lat: number;
	popupBytes: number;
}

interface ChunkAssignmentOptions {
	capBytes?: number;
}

interface ChunkAssignment {
	chunkKeyById: Map<string, string>;
	// Chunk keys in deterministic order, each mapped to the ids it holds
	chunkIds: Map<string, Array<string>>;
}

function clampCell(value: number, min: number, span: number): number {
	const raw = Math.floor(((value - min) / span) * hilbertSide);
	if (raw < 0) return 0;
	if (raw >= hilbertSide) return hilbertSide - 1;
	return raw;
}

// Standard xy2d: fold grid coords into a distance along the Hilbert curve
function hilbertIndex(gridX: number, gridY: number): number {
	let x = gridX;
	let y = gridY;
	let distance = 0;

	for (let side = hilbertSide >> 1; side > 0; side >>= 1) {
		const rx = (x & side) > 0 ? 1 : 0;
		const ry = (y & side) > 0 ? 1 : 0;
		distance += side * side * ((3 * rx) ^ ry);
		if (ry === 0) {
			if (rx === 1) {
				x = side - 1 - x;
				y = side - 1 - y;
			}
			[x, y] = [y, x];
		}
	}

	return distance;
}

// Bin every item into a size-bounded chunk, ordered along the Hilbert curve so bins stay coherent
export function assignChunks(
	items: Array<ChunkInputItem>,
	options?: ChunkAssignmentOptions,
): ChunkAssignment {
	const capBytes = options?.capBytes ?? chunkBytesLimitKb;

	const ordered = items
		.map((item) => ({
			item,
			hilbert: hilbertIndex(clampCell(item.lng, -180, 360), clampCell(90 - item.lat, 0, 180)),
		}))
		.sort((a, b) => a.hilbert - b.hilbert || a.item.id.localeCompare(b.item.id));

	const result: ChunkAssignment = { chunkKeyById: new Map(), chunkIds: new Map() };

	let bin: Array<ChunkInputItem> = [];
	let binBytes = 2; // Opening + closing brackets, for completeness
	let nextKey = 0;

	function closeBin(): void {
		if (bin.length === 0) return;

		const key = String(nextKey++);
		const ids = bin.map((entry) => entry.id).sort((a, b) => a.localeCompare(b));

		result.chunkIds.set(key, ids);
		for (const entry of bin) {
			result.chunkKeyById.set(entry.id, key);
		}
		bin = [];
		binBytes = 2;
	}

	// Next-fit: never reorders, so each closed bin is one contiguous curve run
	for (const { item } of ordered) {
		const wouldAdd = item.popupBytes + (bin.length > 0 ? 1 : 0); // Comma if not first

		if (bin.length > 0 && binBytes + wouldAdd > capBytes) closeBin();
		binBytes += item.popupBytes + (bin.length > 0 ? 1 : 0);
		bin.push(item);
	}
	closeBin();

	return result;
}
