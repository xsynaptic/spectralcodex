import { describe, expect, test } from 'vitest';

import {
	clampPaneWidth,
	getPaneWidthForKey,
	getPaneWidthRange,
} from '#lib/atlas/atlas-pane-factory.ts';

const limits = { mapMin: 320, paneMin: 640, rootFontSize: 16, viewportWidth: 1600 };

describe('getPaneWidthRange', () => {
	test('the pane minimum wins when the viewport cannot hold both', () => {
		expect(getPaneWidthRange({ ...limits, viewportWidth: 900 })).toEqual({
			max: 640,
			min: 640,
		});
	});
});

describe('clampPaneWidth', () => {
	test.each([
		[800, 1600, 800],
		[100, 1600, 640],
		[1500, 1600, 1280],
		[1280, 1100, 780],
	])('%i on a %i viewport clamps to %i', (width, viewportWidth, expected) => {
		expect(clampPaneWidth(width, { ...limits, viewportWidth })).toBe(expected);
	});
});

describe('getPaneWidthForKey', () => {
	test.each([
		['ArrowLeft', 832],
		['ArrowRight', 768],
		['Home', 640],
		['End', 1280],
		['Tab', undefined],
	])('%s takes a pane 800 wide to %s; left widens it', (key, expected) => {
		expect(getPaneWidthForKey(key, 800, limits)).toBe(expected);
	});
});
