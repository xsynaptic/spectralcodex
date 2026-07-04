import { describe, expect, test } from 'vitest';

import type { HierarchyNode } from '#lib/utils/hierarchy.ts';

import { createHierarchy } from '#lib/utils/hierarchy.ts';

// taiwan > { north > taipei, south }, plus a separate canada root
const nodes: Array<HierarchyNode> = [
	{ id: 'taiwan' },
	{ id: 'north', parentId: 'taiwan' },
	{ id: 'south', parentId: 'taiwan' },
	{ id: 'taipei', parentId: 'north' },
	{ id: 'canada' },
];

const isWithin = (ordinal: number, interval: readonly [number, number]): boolean =>
	ordinal >= interval[0] && ordinal <= interval[1];

describe('createHierarchy nested-set numbering', () => {
	const tree = createHierarchy(nodes);
	const { ordinalById, intervalById } = tree;

	test('an ancestor interval contains all its descendant ordinals', () => {
		const taiwan = intervalById.get('taiwan')!;

		for (const id of ['taiwan', 'north', 'south', 'taipei']) {
			expect(isWithin(ordinalById.get(id)!, taiwan)).toBe(true);
		}
	});

	test('sibling and separate-root subtrees are disjoint', () => {
		const north = intervalById.get('north')!;
		const canada = intervalById.get('canada')!;

		expect(isWithin(ordinalById.get('south')!, north)).toBe(false); // sibling, not inside
		expect(isWithin(ordinalById.get('taipei')!, north)).toBe(true); // child, inside
		expect(isWithin(ordinalById.get('taiwan')!, canada)).toBe(false); // separate root
	});

	test('a region listed directly is on its own subtree but not deeper', () => {
		const taiwanOrdinal = ordinalById.get('taiwan')!;

		expect(isWithin(taiwanOrdinal, intervalById.get('taiwan')!)).toBe(true);
		expect(isWithin(taiwanOrdinal, intervalById.get('taipei')!)).toBe(false);
	});

	test('numbering is deterministic regardless of input order', () => {
		const again = createHierarchy(nodes.toReversed());

		for (const id of ['taiwan', 'north', 'south', 'taipei', 'canada']) {
			expect(again.ordinalById.get(id)).toBe(ordinalById.get(id));
			expect(again.intervalById.get(id)).toStrictEqual(intervalById.get(id));
		}
	});
});

describe('createHierarchy adjacency', () => {
	const tree = createHierarchy(nodes);

	test('roots are id-sorted and exclude non-roots', () => {
		expect(tree.roots).toStrictEqual(['canada', 'taiwan']);
	});

	test('ancestorsOf is nearest-first and self-exclusive, so .at(-1) is the root', () => {
		expect(tree.ancestorsOf('taipei')).toStrictEqual(['north', 'taiwan']);
		expect(tree.ancestorsOf('taiwan')).toStrictEqual([]); // a root has none
	});

	test('childrenOf returns direct children only, id-sorted', () => {
		expect(tree.childrenOf('taiwan')).toStrictEqual(['north', 'south']);
		expect(tree.childrenOf('taipei')).toStrictEqual([]);
	});

	test('siblingsOf excludes self', () => {
		expect(tree.siblingsOf('north')).toStrictEqual(['south']);
		expect(tree.siblingsOf('taiwan')).toStrictEqual(['canada']);
		expect(tree.siblingsOf('taipei')).toStrictEqual([]);
	});

	test('descendantsOf is self-exclusive and matches subtree membership', () => {
		expect(new Set(tree.descendantsOf('taiwan'))).toStrictEqual(
			new Set(['north', 'south', 'taipei']),
		);
		expect(tree.descendantsOf('taipei')).toStrictEqual([]);
	});

	test('malformed parents are tolerated: dangling and self references become roots', () => {
		const malformed = createHierarchy([
			{ id: 'orphan', parentId: 'missing' },
			{ id: 'child', parentId: 'orphan' },
			{ id: 'loop', parentId: 'loop' },
		]);

		expect(malformed.roots).toStrictEqual(['loop', 'orphan']);
		expect(malformed.parentOf('orphan')).toBeUndefined();
		expect(malformed.ancestorsOf('child')).toStrictEqual(['orphan']);
		expect(malformed.ancestorsOf('loop')).toStrictEqual([]);
	});
});

describe('createHierarchy containment queries', () => {
	const tree = createHierarchy(nodes);

	test('isDescendantOf reflects subtree containment', () => {
		expect(tree.isDescendantOf('taipei', 'taiwan')).toBe(true);
		expect(tree.isDescendantOf('taipei', 'north')).toBe(true);
		expect(tree.isDescendantOf('south', 'north')).toBe(false);
		expect(tree.isDescendantOf('taiwan', 'canada')).toBe(false);
		expect(tree.isDescendantOf('nope', 'taiwan')).toBe(false);
	});

	test('commonAncestorOf returns the deepest spanning region', () => {
		expect(tree.commonAncestorOf(['taipei', 'south'])).toBe('taiwan');
		expect(tree.commonAncestorOf(['taipei', 'north'])).toBe('north');
		expect(tree.commonAncestorOf(['taipei'])).toBe('taipei');
	});

	test('commonAncestorOf handles disjoint, unknown, and empty inputs', () => {
		expect(tree.commonAncestorOf(['taipei', 'canada'])).toBeUndefined(); // no shared root
		expect(tree.commonAncestorOf(['taipei', 'unknown'])).toBe('taipei'); // unknown ignored
		expect(tree.commonAncestorOf(['unknown'])).toBeUndefined();
		expect(tree.commonAncestorOf([])).toBeUndefined();
	});
});
