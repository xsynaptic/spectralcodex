const chunkBytesLimitKb = 150 * 1024;

const hilbertOrder = 16;
const hilbertSide = 2 ** hilbertOrder;

export interface ChunkInputItem {
	id: string;
	lat: number;
	lng: number;
	popupBytes: number;
}

interface ChunkAssignment {
	chunkIds: Map<string, Array<string>>;
	chunkKeyById: Map<string, string>;
}

interface ChunkAssignmentOptions {
	capBytes?: number;
}

export function assignChunks(
	items: Array<ChunkInputItem>,
	options?: ChunkAssignmentOptions,
): ChunkAssignment {
	const capBytes = options?.capBytes ?? chunkBytesLimitKb;

	const ordered = items
		.map((item) => ({
			hilbert: hilbertIndex(clampCell(item.lng, -180, 360), clampCell(90 - item.lat, 0, 180)),
			item,
		}))
		.toSorted((a, b) => a.hilbert - b.hilbert || a.item.id.localeCompare(b.item.id));

	const result: ChunkAssignment = { chunkIds: new Map(), chunkKeyById: new Map() };

	let bin: Array<ChunkInputItem> = [];
	let binBytes = 2;
	let nextKey = 0;

	function closeBin(): void {
		if (bin.length === 0) return;

		const key = String(nextKey++);
		const ids = bin.map((entry) => entry.id).toSorted((a, b) => a.localeCompare(b));

		result.chunkIds.set(key, ids);
		for (const entry of bin) {
			result.chunkKeyById.set(entry.id, key);
		}
		bin = [];
		binBytes = 2;
	}

	for (const { item } of ordered) {
		const wouldAdd = item.popupBytes + (bin.length > 0 ? 1 : 0);

		if (bin.length > 0 && binBytes + wouldAdd > capBytes) closeBin();
		binBytes += item.popupBytes + (bin.length > 0 ? 1 : 0);
		bin.push(item);
	}
	closeBin();

	return result;
}

function clampCell(value: number, min: number, span: number): number {
	const raw = Math.floor(((value - min) / span) * hilbertSide);
	if (raw < 0) return 0;
	if (raw >= hilbertSide) return hilbertSide - 1;
	return raw;
}

function hilbertIndex(gridX: number, gridY: number): number {
	let x = gridX;
	let y = gridY;
	let distance = 0;

	for (let side = hilbertSide >> 1; side > 0; side >>= 1) {
		const rx = (x & side) > 0 ? 1 : 0;
		const ry = (y & side) > 0 ? 1 : 0;
		distance += side * side * ((3 * rx) ^ ry);
		if (ry !== 0) {
			continue;
		}

		if (rx === 1) {
			x = side - 1 - x;
			y = side - 1 - y;
		}
		[x, y] = [y, x];
	}

	return distance;
}
