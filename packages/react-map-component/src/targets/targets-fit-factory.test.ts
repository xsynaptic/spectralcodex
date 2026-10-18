import { describe, expect, test } from 'vitest';

import {
	getTargetBounds,
	getTargetDuration,
	getTargetZoom,
	isInView,
} from '#targets/targets-fit-factory.ts';

describe('getTargetBounds', () => {
	test('no positions yields no bounds', () => {
		expect(getTargetBounds([])).toBeUndefined();
	});

	test('several positions yield the box around all of them', () => {
		expect(
			getTargetBounds([
				[121.8, 24.6],
				[121, 25],
				[122, 24],
			]),
		).toEqual([
			[121, 24],
			[122, 25],
		]);
	});
});

describe('getTargetZoom', () => {
	test('a zoom that already shows everything is kept', () => {
		expect(getTargetZoom(13, 16)).toBe(13);
	});

	test('a zoom too close to show everything pulls back to the fit', () => {
		expect(getTargetZoom(16, 13.5)).toBe(13.5);
		expect(getTargetZoom(11, 10)).toBe(10);
	});

	test('a far-out zoom pulls in, never past the fit', () => {
		expect(getTargetZoom(8, 19)).toBe(14);
		expect(getTargetZoom(8, 10)).toBe(10);
	});

	test('a single point, which fits at any zoom, stops at the maximum', () => {
		expect(getTargetZoom(19, 22)).toBe(17);
	});
});

describe('getTargetDuration', () => {
	test('a move takes longer the farther it zooms in or out or pans, up to a cap', () => {
		expect(getTargetDuration(-3, 0)).toBe(getTargetDuration(3, 0));
		expect(getTargetDuration(3, 0)).toBeGreaterThan(getTargetDuration(0, 0));
		expect(getTargetDuration(1, 2)).toBeGreaterThan(getTargetDuration(0, 2));
		expect(getTargetDuration(0, 40)).toBe(getTargetDuration(8, 0));
	});
});

describe('isInView', () => {
	const frame = { bottom: 300, left: 50, right: 750, top: 50 };
	const corner = { x: 50, y: 50 };
	const inside = { x: 400, y: 200 };
	const past = { x: 760, y: 200 };

	test('every point inside the frame, edges included, at a working zoom is in view', () => {
		expect(isInView([corner, inside], frame, 14)).toBe(true);
	});

	test('one point past an edge, no point, or too far out is not in view', () => {
		expect(isInView([inside, past], frame, 14)).toBe(false);
		expect(isInView([], frame, 14)).toBe(false);
		expect(isInView([inside], frame, 8)).toBe(false);
	});
});
