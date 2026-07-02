/**
 * Nested-set numbering over the regions forest
 * A depth-first walk (children sorted by id for determinism) assigns each region a `left` ordinal
 * and a `[left, right]` interval
 * A point listing region G is inside region R's subtree iff `left(R) <= left(G) <= right(R)`
 * This reproduces the cumulative `_locations` membership used by region maps without shipping the tree
 */

export interface RegionNode {
	id: string;
	parent?: string | undefined;
}

interface RegionOrdinals {
	// The ordinal a listed region contributes to a point
	ordinalById: Map<string, number>;
	// The containment interval a region map filters with
	intervalById: Map<string, [number, number]>;
}

const byId = (a: string, b: string) => a.localeCompare(b);

export function computeRegionOrdinals(regions: Array<RegionNode>): RegionOrdinals {
	const idSet = new Set(regions.map((region) => region.id));

	const childrenByParent = new Map<string, Array<string>>();
	const roots: Array<string> = [];

	for (const region of regions) {
		const hasParent = region.parent !== undefined && idSet.has(region.parent);

		if (!hasParent) {
			roots.push(region.id);
			continue;
		}

		const siblings = childrenByParent.get(region.parent!);
		if (siblings) {
			siblings.push(region.id);
		} else {
			childrenByParent.set(region.parent!, [region.id]);
		}
	}

	roots.sort(byId);
	for (const siblings of childrenByParent.values()) {
		siblings.sort(byId);
	}

	const ordinalById = new Map<string, number>();
	const intervalById = new Map<string, [number, number]>();
	const visited = new Set<string>();

	let counter = 1;

	function visit(id: string): void {
		if (visited.has(id)) return; // defensive against malformed cycles
		visited.add(id);

		const left = counter;
		counter += 1;
		ordinalById.set(id, left);

		const children = childrenByParent.get(id) ?? [];
		for (const childId of children) {
			visit(childId);
		}

		const right = counter;
		counter += 1;
		intervalById.set(id, [left, right]);
	}

	for (const rootId of roots) {
		visit(rootId);
	}

	return { ordinalById, intervalById };
}

// True when a point contributing the given region `left` ordinals falls inside a region's interval
export function isWithinRegionInterval(
	ordinals: ReadonlyArray<number>,
	interval: readonly [number, number],
): boolean {
	const [left, right] = interval;
	return ordinals.some((ordinal) => ordinal >= left && ordinal <= right);
}
