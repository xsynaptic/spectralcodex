/**
 * Fixed-grid quadtree over world lon/lat, splitting a cell into four whenever its raw popup payload
 * exceeds the cap; keys are `z-x-y`
 * The grid is power-of-two and equirectangular, so cells nest exactly: a point's cell at zoom z+1
 * is always a child of its cell at zoom z
 * Built fresh each build and each point carries its resolved key, so no manifest is needed
 */

const CHUNK_CAP_BYTES = 250 * 1024;

// Safety bound; content today reaches ~depth 11, so this leaves generous headroom
const CHUNK_MAX_DEPTH = 14;

export interface ChunkInputItem {
	id: string;
	lng: number;
	lat: number;
	// Byte length of this point's serialized popup entry (the payload the cap measures)
	popupBytes: number;
}

interface ChunkAssignmentOptions {
	capBytes?: number;
	maxDepth?: number;
}

interface ChunkAssignment {
	chunkKeyById: Map<string, string>;
	// Chunk keys in deterministic order, each mapped to the ids it holds
	chunkIds: Map<string, Array<string>>;
}

function getCellCoordinate(value: number, min: number, span: number, cells: number): number {
	const raw = Math.floor(((value - min) / span) * cells);
	if (raw < 0) return 0;
	if (raw >= cells) return cells - 1;
	return raw;
}

// Latitude runs north-to-south so y increases downward, matching slippy-tile convention
function getTileX(lng: number, zoom: number): number {
	return getCellCoordinate(lng, -180, 360, 2 ** zoom);
}

function getTileY(lat: number, zoom: number): number {
	return getCellCoordinate(90 - lat, 0, 180, 2 ** zoom);
}

// Array framing (brackets + commas) added to the summed item bytes
function getPayloadBytes(items: Array<ChunkInputItem>): number {
	let total = 2; // opening and closing brackets
	for (const item of items) {
		total += item.popupBytes;
	}
	if (items.length > 1) total += items.length - 1; // comma separators
	return total;
}

function assignCell(
	items: Array<ChunkInputItem>,
	zoom: number,
	x: number,
	y: number,
	capBytes: number,
	maxDepth: number,
	result: ChunkAssignment,
): void {
	if (items.length === 0) return;

	const underCap = getPayloadBytes(items) <= capBytes;

	if (items.length === 1 || underCap || zoom >= maxDepth) {
		const key = `${String(zoom)}-${String(x)}-${String(y)}`;
		const ids = items.map((item) => item.id).sort((a, b) => a.localeCompare(b));
		result.chunkIds.set(key, ids);
		for (const item of items) {
			result.chunkKeyById.set(item.id, key);
		}
		return;
	}

	const childZoom = zoom + 1;
	const buckets = new Map<string, Array<ChunkInputItem>>();

	for (const item of items) {
		const childX = getTileX(item.lng, childZoom);
		const childY = getTileY(item.lat, childZoom);
		const bucketKey = `${String(childX)}-${String(childY)}`;
		const bucket = buckets.get(bucketKey);
		if (bucket) {
			bucket.push(item);
		} else {
			buckets.set(bucketKey, [item]);
		}
	}

	// Visit children in a stable order so output is deterministic
	const orderedKeys = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
	for (const bucketKey of orderedKeys) {
		const [childX, childY] = bucketKey.split('-').map(Number) as [number, number];
		assignCell(buckets.get(bucketKey)!, childZoom, childX, childY, capBytes, maxDepth, result);
	}
}

// Assign every item a chunk key by recursively splitting the world grid until each cell fits the cap
export function assignChunks(
	items: Array<ChunkInputItem>,
	options?: ChunkAssignmentOptions,
): ChunkAssignment {
	const capBytes = options?.capBytes ?? CHUNK_CAP_BYTES;
	const maxDepth = options?.maxDepth ?? CHUNK_MAX_DEPTH;

	const result: ChunkAssignment = {
		chunkKeyById: new Map(),
		chunkIds: new Map(),
	};

	assignCell(items, 0, 0, 0, capBytes, maxDepth, result);

	return result;
}
