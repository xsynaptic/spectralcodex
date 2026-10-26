import { describe, expect, test } from 'vitest';

import { getArcCoordinates } from '#source/source-arc-factory.ts';

describe('getArcCoordinates', () => {
	test('starts and ends on the ends and bows to one side of the chord', () => {
		const arc = getArcCoordinates([120, 23], [120.2, 23]);
		const middle = arc[Math.floor(arc.length / 2)];

		expect(arc.at(0)?.[0]).toBeCloseTo(120);
		expect(arc.at(0)?.[1]).toBeCloseTo(23);
		expect(arc.at(-1)?.[0]).toBeCloseTo(120.2);
		expect(arc.at(-1)?.[1]).toBeCloseTo(23);
		expect(middle?.[1]).toBeGreaterThan(23.01);
	});

	test('a path runs from its first end whichever way the bow is drawn', () => {
		const west: [number, number] = [120, 23];
		const east: [number, number] = [120.25, 23.05];
		const westward = getArcCoordinates(east, west);

		expect(westward.at(0)?.[0]).toBeCloseTo(120.25);
		expect(westward.at(0)?.[1]).toBeCloseTo(23.05);
		expect(westward).toEqual(getArcCoordinates(west, east).toReversed());
	});
});
