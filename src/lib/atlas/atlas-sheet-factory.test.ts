import { describe, expect, test } from 'vitest';

import { getSheetDragOffset, getSheetRelease } from '#lib/atlas/atlas-sheet-factory.ts';

describe('getSheetDragOffset', () => {
	test('a raised sheet follows the pointer down and never rises past its own top', () => {
		expect(getSheetDragOffset({ deltaY: 300, restPx: 0 })).toBe(300);
		expect(getSheetDragOffset({ deltaY: 5000, restPx: 0 })).toBe(5000);
		expect(getSheetDragOffset({ deltaY: -40, restPx: 0 })).toBe(0);
	});

	test('a lowered sheet follows the pointer up from where it rests', () => {
		expect(getSheetDragOffset({ deltaY: -200, restPx: 820 })).toBe(620);
		expect(getSheetDragOffset({ deltaY: -2000, restPx: 820 })).toBe(0);
	});

	test('a lowered sheet cannot be pushed below where it rests', () => {
		expect(getSheetDragOffset({ deltaY: 60, restPx: 820 })).toBe(820);
	});
});

describe('getSheetRelease', () => {
	const viewportHeight = 800;
	const drag = { eventType: 'pointerup', isDragged: true, viewportHeight };

	test('a drag toggles from a fifth of the viewport height', () => {
		expect(getSheetRelease({ ...drag, travelPx: 159 })).toBe('settle');
		expect(getSheetRelease({ ...drag, travelPx: 160 })).toBe('toggle');
	});

	test('the threshold is the same pulling a lowered sheet up', () => {
		const restPx = 776;
		const getTravelPx = (deltaY: number) =>
			Math.abs(getSheetDragOffset({ deltaY, restPx }) - restPx);

		expect(getSheetRelease({ ...drag, travelPx: getTravelPx(-159) })).toBe('settle');
		expect(getSheetRelease({ ...drag, travelPx: getTravelPx(-160) })).toBe('toggle');
	});

	test('a tap inside the tolerance toggles without travelling', () => {
		expect(getSheetRelease({ ...drag, isDragged: false, travelPx: 0 })).toBe('toggle');
	});

	test('a drag pushed against the clamp settles, having travelled nowhere', () => {
		const travelPx = Math.abs(getSheetDragOffset({ deltaY: 400, restPx: 776 }) - 776);

		expect(getSheetRelease({ ...drag, travelPx })).toBe('settle');
	});

	test('a cancelled pointer settles whatever it did', () => {
		expect(
			getSheetRelease({ ...drag, eventType: 'pointercancel', isDragged: false, travelPx: 0 }),
		).toBe('settle');
		expect(getSheetRelease({ ...drag, eventType: 'pointercancel', travelPx: 600 })).toBe('settle');
	});
});
