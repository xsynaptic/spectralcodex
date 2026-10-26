import { describe, expect, test } from 'vitest';

import type { ArcEnd } from '#source/source-arc-factory.ts';

import { getArcCoordinates } from '#source/source-arc-factory.ts';

function endAt(coordinates: [number, number], displayedCoordinates = coordinates): ArcEnd {
	return { coordinates, displayedCoordinates };
}

describe('getArcCoordinates', () => {
	test('starts and ends on the ends and bows to one side of the chord', () => {
		const arc = getArcCoordinates(endAt([120, 23]), endAt([120.2, 23]));
		const middle = arc[Math.floor(arc.length / 2)];

		expect(arc.at(0)?.[0]).toBeCloseTo(120);
		expect(arc.at(0)?.[1]).toBeCloseTo(23);
		expect(arc.at(-1)?.[0]).toBeCloseTo(120.2);
		expect(arc.at(-1)?.[1]).toBeCloseTo(23);
		expect(middle?.[1]).toBeGreaterThan(23.01);
	});

	test('an end drawn nearby in a cluster bends only the stretch near that end', () => {
		const settled = getArcCoordinates(endAt([120, 23]), endAt([120.2, 23]));
		const bent = getArcCoordinates(endAt([120, 23]), endAt([120.2, 23], [120.23, 23.02]));

		expect(bent.at(-1)?.[0]).toBeCloseTo(120.23);
		expect(bent.at(-1)?.[1]).toBeCloseTo(23.02);
		expect(bent.slice(0, 20)).toEqual(settled.slice(0, 20));
	});

	test('an end drawn farther off than its bending stretch redraws the arc between the drawn ends', () => {
		const redrawn = getArcCoordinates(endAt([120, 23]), endAt([120.02, 23], [120.05, 23.04]));

		expect(redrawn).toEqual(getArcCoordinates(endAt([120, 23]), endAt([120.05, 23.04])));
	});

	test('a path runs from its first end whichever way the bow is drawn', () => {
		const west = endAt([120, 23]);
		const east = endAt([120.2, 23], [120.25, 23.05]);
		const westward = getArcCoordinates(east, west);

		expect(westward.at(0)?.[0]).toBeCloseTo(120.25);
		expect(westward.at(0)?.[1]).toBeCloseTo(23.05);
		expect(westward).toEqual(getArcCoordinates(west, east).toReversed());
	});
});
