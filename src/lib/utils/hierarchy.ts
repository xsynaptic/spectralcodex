export interface Hierarchy {
	// Nearest-first, self-exclusive; last element is the root
	ancestorsOf(id: string): ReadonlyArray<string>;
	// Direct children, id-sorted, [] if none
	childrenOf(id: string): ReadonlyArray<string>;
	// Deepest node whose subtree spans every id (self-inclusive); undefined if they share no root
	commonAncestorOf(ids: Array<string>): string | undefined;
	// Preorder, self-exclusive
	descendantsOf(id: string): ReadonlyArray<string>;
	// Containment interval per node; a region map filters with its own interval
	intervalById: ReadonlyMap<string, [number, number]>;
	// Preorder ordinal per node; region membership on a map reads this
	ordinalById: ReadonlyMap<string, number>;
	parentOf(id: string): string | undefined;
	roots: ReadonlyArray<string>;
	// Same-parent minus self, id-sorted
	siblingsOf(id: string): ReadonlyArray<string>;
}

/**
 * Generic, dependency-free hierarchy index over a flat node list (parent adjacency)
 * A single depth-first walk yields:
 * - adjacency indexes (parent/children/ancestors)
 * - nested-set numbering (ordinal + [left, right] interval)
 */
export interface HierarchyNode {
	id: string;
	parentId?: string;
}

const byId = (idA: string, idB: string): number => idA.localeCompare(idB);

export function createHierarchy(nodes: Array<HierarchyNode>): Hierarchy {
	const idSet = new Set(nodes.map((node) => node.id));

	validateParents(nodes);

	const { childrenByParent, parentById, roots } = indexAdjacency(nodes);
	const { descendantsById, intervalById, ordinalById } = numberNestedSets(roots, childrenByParent);

	function ancestorsOf(id: string): Array<string> {
		const ancestors: Array<string> = [];

		for (
			let current = parentById.get(id);
			current !== undefined;
			current = parentById.get(current)
		) {
			ancestors.push(current);
		}
		return ancestors;
	}

	function siblingsOf(id: string): Array<string> {
		const parent = parentById.get(id);
		const group = parent === undefined ? roots : (childrenByParent.get(parent) ?? []);

		return group.filter((siblingId) => siblingId !== id);
	}

	function commonAncestorOf(ids: Array<string>): string | undefined {
		const known = ids.filter((id) => idSet.has(id));
		const first = known[0];

		if (first === undefined) return undefined;

		// Any common ancestor must span `first`, so it lies on its self-inclusive path; nearest-first wins
		for (const candidate of [first, ...ancestorsOf(first)]) {
			const interval = intervalById.get(candidate)!;
			const isSpansAll = known.every((id) => {
				const ordinal = ordinalById.get(id)!;
				return ordinal >= interval[0] && ordinal <= interval[1];
			});
			if (isSpansAll) return candidate;
		}
		return undefined;
	}

	return {
		ancestorsOf,
		childrenOf: (id) => childrenByParent.get(id) ?? [],
		commonAncestorOf,
		descendantsOf: (id) => descendantsById.get(id) ?? [],
		intervalById,
		ordinalById,
		parentOf: (id) => parentById.get(id),
		roots,
		siblingsOf,
	};
}

function validateParents(nodes: Array<HierarchyNode>) {
	const parentById = new Map(nodes.map((node) => [node.id, node.parentId]));

	for (const [id, parentId] of parentById) {
		if (parentId !== undefined && !parentById.has(parentId)) {
			throw new Error(`Error: "${id}" has a parent "${parentId}" that does not exist!`);
		}

		const chain = [id];

		for (
			let ancestorId = parentId;
			ancestorId !== undefined;
			ancestorId = parentById.get(ancestorId)
		) {
			if (chain.includes(ancestorId)) {
				throw new Error(`Error: parents form a loop: ${[...chain, ancestorId].join(' > ')}!`);
			}

			chain.push(ancestorId);
		}
	}
}

function indexAdjacency(nodes: Array<HierarchyNode>) {
	const parentById = new Map<string, string>();
	const childrenByParent = new Map<string, Array<string>>();
	const roots: Array<string> = [];

	for (const { id, parentId } of nodes) {
		if (parentId === undefined) {
			roots.push(id);
			continue;
		}

		parentById.set(id, parentId);

		const siblings = childrenByParent.get(parentId);
		if (siblings) {
			siblings.push(id);
		} else {
			childrenByParent.set(parentId, [id]);
		}
	}

	roots.sort(byId);

	for (const siblings of childrenByParent.values()) {
		siblings.sort(byId);
	}

	return { childrenByParent, parentById, roots };
}

function numberNestedSets(
	roots: ReadonlyArray<string>,
	childrenByParent: ReadonlyMap<string, Array<string>>,
) {
	const ordinalById = new Map<string, number>();
	const intervalById = new Map<string, [number, number]>();
	const descendantsById = new Map<string, Array<string>>();

	let counter = 1;

	function visit(id: string): Array<string> {
		const left = counter;

		counter += 1;
		ordinalById.set(id, left);

		const descendants: Array<string> = [];
		const children = childrenByParent.get(id) ?? [];

		for (const childId of children) {
			descendants.push(childId, ...visit(childId));
		}
		descendantsById.set(id, descendants);

		const right = counter;

		counter += 1;
		intervalById.set(id, [left, right]);

		return descendants;
	}

	for (const rootId of roots) {
		visit(rootId);
	}

	return { descendantsById, intervalById, ordinalById };
}
