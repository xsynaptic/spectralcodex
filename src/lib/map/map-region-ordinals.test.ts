import { describe, expect, test } from 'vitest';

import type { RegionNode } from '#lib/map/map-region-ordinals.ts';

import { computeRegionOrdinals, isWithinRegionInterval } from '#lib/map/map-region-ordinals.ts';

const regions: Array<RegionNode> = [
	{ id: 'taiwan', parent: undefined },
	{ id: 'north', parent: 'taiwan' },
	{ id: 'south', parent: 'taiwan' },
	{ id: 'taipei', parent: 'north' },
	{ id: 'canada', parent: undefined },
];

describe('computeRegionOrdinals', () => {
	const { ordinalById, intervalById } = computeRegionOrdinals(regions);

	test('parent interval contains all descendant ordinals', () => {
		const taiwan = intervalById.get('taiwan')!;

		for (const id of ['taiwan', 'north', 'south', 'taipei']) {
			expect(isWithinRegionInterval([ordinalById.get(id)!], taiwan)).toBe(true);
		}
	});

	test('sibling subtrees are disjoint', () => {
		const north = intervalById.get('north')!;

		// south is a sibling of north, not inside it
		expect(isWithinRegionInterval([ordinalById.get('south')!], north)).toBe(false);
		// taipei is inside north
		expect(isWithinRegionInterval([ordinalById.get('taipei')!], north)).toBe(true);
	});

	test('separate root trees do not overlap', () => {
		const taiwan = intervalById.get('taiwan')!;
		const canada = intervalById.get('canada')!;

		expect(isWithinRegionInterval([ordinalById.get('canada')!], taiwan)).toBe(false);
		expect(isWithinRegionInterval([ordinalById.get('taiwan')!], canada)).toBe(false);
	});

	test('a location listing a region directly appears only on that subtree, not deeper', () => {
		// A point that lists "taiwan" itself is on the taiwan map but not the taipei map
		const taiwanOrdinal = ordinalById.get('taiwan')!;

		expect(isWithinRegionInterval([taiwanOrdinal], intervalById.get('taiwan')!)).toBe(true);
		expect(isWithinRegionInterval([taiwanOrdinal], intervalById.get('taipei')!)).toBe(false);
	});

	test('multi-region point matches if any ordinal is inside', () => {
		const taipei = intervalById.get('taipei')!;
		const point = [ordinalById.get('canada')!, ordinalById.get('taipei')!];

		expect(isWithinRegionInterval(point, taipei)).toBe(true);
	});

	test('is deterministic across runs', () => {
		const again = computeRegionOrdinals(regions.toReversed());

		for (const id of ['taiwan', 'north', 'south', 'taipei', 'canada']) {
			expect(again.ordinalById.get(id)).toBe(ordinalById.get(id));
		}
	});
});
