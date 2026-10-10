import { describe, expect, test } from 'vitest';

import {
	clampPaneWidth,
	getPaneWidthForKey,
	getPaneWidthRange,
} from '#lib/atlas/atlas-pane-factory.ts';

const limits = { mapMin: 320, paneMin: 640, rootFontSize: 16, viewportWidth: 1600 };

describe('getPaneWidthRange', () => {
	test('the pane spans from its own minimum to what leaves the map its minimum', () => {
		expect(getPaneWidthRange(limits)).toEqual({ max: 1280, min: 640 });
	});

	test('the pane minimum wins when the viewport cannot hold both', () => {
		expect(getPaneWidthRange({ ...limits, viewportWidth: 900 })).toEqual({
			max: 640,
			min: 640,
		});
	});
});

describe('clampPaneWidth', () => {
	test('a width inside the range is kept', () => {
		expect(clampPaneWidth(800, limits)).toBe(800);
	});

	test('a width past either limit stops at it', () => {
		expect(clampPaneWidth(100, limits)).toBe(640);
		expect(clampPaneWidth(1500, limits)).toBe(1280);
	});

	test('a width stored on a wider viewport shrinks to fit a narrower one', () => {
		expect(clampPaneWidth(1280, { ...limits, viewportWidth: 1100 })).toBe(780);
	});
});

describe('getPaneWidthForKey', () => {
	test('left widens the pane and right narrows it', () => {
		expect(getPaneWidthForKey('ArrowLeft', 800, limits)).toBe(832);
		expect(getPaneWidthForKey('ArrowRight', 800, limits)).toBe(768);
	});

	test('arrows stop at the limits', () => {
		expect(getPaneWidthForKey('ArrowLeft', 1270, limits)).toBe(1280);
		expect(getPaneWidthForKey('ArrowRight', 650, limits)).toBe(640);
	});

	test('home and end jump to the limits', () => {
		expect(getPaneWidthForKey('Home', 800, limits)).toBe(640);
		expect(getPaneWidthForKey('End', 800, limits)).toBe(1280);
	});

	test('other keys are left alone', () => {
		expect(getPaneWidthForKey('Tab', 800, limits)).toBeUndefined();
	});
});
