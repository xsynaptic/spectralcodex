/**
 * Generic, dependency-free hierarchy index over a flat node list (parent adjacency)
 * A single depth-first walk yields:
 * - adjacency indexes (parent/children/ancestors)
 * - nested-set numbering (ordinal + [left, right] interval + depth)
 */
export interface HierarchyNode {
	id: string;
	parentId?: string;
}

export interface Hierarchy {
	roots: ReadonlyArray<string>;
	has(id: string): boolean;
	parentOf(id: string): string | undefined;
	// Direct children, id-sorted, [] if none
	childrenOf(id: string): ReadonlyArray<string>;
	// Same-parent minus self, id-sorted
	siblingsOf(id: string): ReadonlyArray<string>;
	// Nearest-first, self-exclusive; last element is the root
	ancestorsOf(id: string): ReadonlyArray<string>;
	// Preorder, self-exclusive
	descendantsOf(id: string): ReadonlyArray<string>;
	// Interval containment; self-inclusive (a node is within its own interval)
	isDescendantOf(id: string, ancestorId: string): boolean;
	// Deepest node whose subtree spans every id (self-inclusive); undefined if they share no root
	commonAncestorOf(ids: Array<string>): string | undefined;
	depthOf(id: string): number;
	// Preorder ordinal per node; region membership on a map reads this
	ordinalById: ReadonlyMap<string, number>;
	// Containment interval per node; a region map filters with its own interval
	intervalById: ReadonlyMap<string, [number, number]>;
}

const byId = (idA: string, idB: string): number => idA.localeCompare(idB);

export function createHierarchy(nodes: Array<HierarchyNode>): Hierarchy {
	const idSet = new Set(nodes.map((node) => node.id));

	// Only edges whose parent exists in the set; a missing, dangling, or self parent makes a root
	const parentById = new Map<string, string>();
	const childrenByParent = new Map<string, Array<string>>();
	const roots: Array<string> = [];

	for (const node of nodes) {
		const hasParent =
			node.parentId !== undefined && node.parentId !== node.id && idSet.has(node.parentId);

		if (!hasParent) {
			roots.push(node.id);
			continue;
		}

		parentById.set(node.id, node.parentId!);

		const siblings = childrenByParent.get(node.parentId!);
		if (siblings) {
			siblings.push(node.id);
		} else {
			childrenByParent.set(node.parentId!, [node.id]);
		}
	}

	roots.sort(byId);

	for (const siblings of childrenByParent.values()) {
		siblings.sort(byId);
	}

	const ordinalById = new Map<string, number>();
	const intervalById = new Map<string, [number, number]>();
	const depthById = new Map<string, number>();
	const descendantsById = new Map<string, Array<string>>();
	const visited = new Set<string>();

	let counter = 1;

	function visit(id: string, depth: number): Array<string> {
		if (visited.has(id)) return []; // Defensive against malformed cycles

		visited.add(id);

		const left = counter;

		counter += 1;
		ordinalById.set(id, left);
		depthById.set(id, depth);

		const descendants: Array<string> = [];
		const children = childrenByParent.get(id) ?? [];

		for (const childId of children) {
			descendants.push(childId, ...visit(childId, depth + 1));
		}
		descendantsById.set(id, descendants);

		const right = counter;

		counter += 1;
		intervalById.set(id, [left, right]);

		return descendants;
	}

	for (const rootId of roots) {
		visit(rootId, 0);
	}

	function ancestorsOf(id: string): Array<string> {
		const ancestors: Array<string> = [];
		const seen = new Set<string>([id]);
		let current = parentById.get(id);

		while (current !== undefined && !seen.has(current)) {
			ancestors.push(current);
			seen.add(current);
			current = parentById.get(current);
		}
		return ancestors;
	}

	function siblingsOf(id: string): Array<string> {
		const parent = parentById.get(id);
		const group = parent === undefined ? roots : (childrenByParent.get(parent) ?? []);

		return group.filter((siblingId) => siblingId !== id);
	}

	function isDescendantOf(id: string, ancestorId: string): boolean {
		const interval = intervalById.get(ancestorId);
		const ordinal = ordinalById.get(id);

		if (!interval || ordinal === undefined) return false;
		return ordinal >= interval[0] && ordinal <= interval[1];
	}

	function commonAncestorOf(ids: Array<string>): string | undefined {
		const known = ids.filter((id) => idSet.has(id));
		const first = known[0];

		if (first === undefined) return undefined;

		// Any common ancestor must span `first`, so it lies on its self-inclusive path; nearest-first wins
		for (const candidate of [first, ...ancestorsOf(first)]) {
			const interval = intervalById.get(candidate)!;
			const spansAll = known.every((id) => {
				const ordinal = ordinalById.get(id)!;
				return ordinal >= interval[0] && ordinal <= interval[1];
			});
			if (spansAll) return candidate;
		}
		return undefined;
	}

	return {
		roots,
		has: (id) => idSet.has(id),
		parentOf: (id) => parentById.get(id),
		childrenOf: (id) => childrenByParent.get(id) ?? [],
		siblingsOf,
		ancestorsOf,
		descendantsOf: (id) => descendantsById.get(id) ?? [],
		isDescendantOf,
		commonAncestorOf,
		depthOf: (id) => depthById.get(id) ?? 0,
		ordinalById,
		intervalById,
	};
}
