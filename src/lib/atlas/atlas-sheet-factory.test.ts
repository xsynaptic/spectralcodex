import { describe, expect, test } from 'vitest';

import {
	getPreferredSheetRest,
	getSheetArrivalRest,
	getSheetDragLine,
	getSheetFold,
	getSheetReleaseRest,
	getSheetRests,
	getSheetSlide,
	getSheetStepRest,
	getSheetTapRest,
	getSheetTranslate,
	isSheetArrivalAtStart,
} from '#lib/atlas/atlas-sheet-factory.ts';

const lines = { down: 776, half: 320, raised: 0 };
const viewportHeight = 800;

describe('getSheetDragLine', () => {
	test('a raised sheet follows the pointer down and never rises past its own top', () => {
		expect(getSheetDragLine({ deltaY: 300, from: 'raised', lines })).toBe(300);
		expect(getSheetDragLine({ deltaY: -40, from: 'raised', lines })).toBe(0);
	});

	test('a half sheet moves both ways from the split', () => {
		expect(getSheetDragLine({ deltaY: -200, from: 'half', lines })).toBe(120);
		expect(getSheetDragLine({ deltaY: 200, from: 'half', lines })).toBe(520);
		expect(getSheetDragLine({ deltaY: -900, from: 'half', lines })).toBe(0);
	});

	test('no sheet is pushed below where a lowered one rests', () => {
		expect(getSheetDragLine({ deltaY: 5000, from: 'raised', lines })).toBe(776);
		expect(getSheetDragLine({ deltaY: 900, from: 'half', lines })).toBe(776);
		expect(getSheetDragLine({ deltaY: 60, from: 'down', lines })).toBe(776);
	});

	test('a lowered sheet follows the pointer up from where it rests', () => {
		expect(getSheetDragLine({ deltaY: -200, from: 'down', lines })).toBe(576);
		expect(getSheetDragLine({ deltaY: -2000, from: 'down', lines })).toBe(0);
	});
});

describe('getSheetReleaseRest', () => {
	const rests = getSheetRests(true);
	const drag = { kind: 'drag', lines, preferred: 'half', rests, viewportHeight } as const;

	function getRest(from: 'down' | 'half' | 'raised', linePx: number, dragRests = rests) {
		return getSheetReleaseRest({ ...drag, from, linePx, rests: dragRests });
	}

	test('a drag leaves its rest from a fifth of the viewport height, in either direction', () => {
		expect(getRest('raised', 159)).toBe('raised');
		expect(getRest('raised', 160)).toBe('half');
		expect(getRest('half', 320 - 159)).toBe('half');
		expect(getRest('half', 320 - 160)).toBe('raised');
		expect(getRest('half', 320 + 159)).toBe('half');
		expect(getRest('half', 320 + 160)).toBe('down');
		expect(getRest('down', 776 - 159)).toBe('down');
		expect(getRest('down', 776 - 160)).toBe('half');
	});

	test('a long pull skips half for the rest nearer the release point', () => {
		expect(getRest('raised', 547)).toBe('half');
		expect(getRest('raised', 549)).toBe('down');
		expect(getRest('down', 161)).toBe('half');
		expect(getRest('down', 159)).toBe('raised');
	});

	test('a release never lands behind the rest the drag started from', () => {
		expect(getRest('half', 0)).toBe('raised');
		expect(getRest('half', 776)).toBe('down');
	});

	test('without the half rest a committed drag crosses to the other rest', () => {
		const twoRests = getSheetRests(false);

		expect(getRest('raised', 160, twoRests)).toBe('down');
		expect(getRest('raised', 159, twoRests)).toBe('raised');
		expect(getRest('down', 776 - 160, twoRests)).toBe('raised');
	});

	test('a drag pushed against the clamp stays, having travelled nowhere', () => {
		expect(getRest('down', getSheetDragLine({ deltaY: 400, from: 'down', lines }))).toBe('down');
	});

	test('a press released inside the tolerance is a tap, whatever line it ended on', () => {
		const tap = { ...drag, kind: 'tap', linePx: 600 } as const;

		expect(getSheetReleaseRest({ ...tap, from: 'half' })).toBe('down');
		expect(getSheetReleaseRest({ ...tap, from: 'down', preferred: 'raised' })).toBe('raised');
	});

	test('a cancelled pointer stays whatever it did', () => {
		expect(getSheetReleaseRest({ ...drag, from: 'raised', kind: 'cancel', linePx: 600 })).toBe(
			'raised',
		);
	});
});

describe('the frame a moving sheet draws', () => {
	const scrollY = 500;
	const scrollMaxY = 2000;
	const slide = { foldPx: scrollY, lines, scrollMaxY, scrollY };

	test('a grab clips the pane where the rest line already cut it', () => {
		expect(getSheetFold({ linePx: lines.raised, paneTop: -scrollY })).toBe(scrollY);
		expect(getSheetFold({ linePx: lines.half, paneTop: lines.half - scrollY })).toBe(scrollY);
		expect(getSheetFold({ linePx: lines.half, paneTop: lines.half })).toBe(0);
	});

	test('a pane above its rest line folds nothing', () => {
		expect(getSheetFold({ linePx: lines.half, paneTop: lines.half + 40 })).toBe(0);
	});

	test('a grab moves nothing: the pane starts untranslated at every rest but lowered', () => {
		expect(getSheetTranslate({ from: 'raised', linePx: lines.raised, lines })).toBe(0);
		expect(getSheetTranslate({ from: 'half', linePx: lines.half, lines })).toBe(0);
		expect(getSheetTranslate({ from: 'down', linePx: lines.down, lines })).toBe(lines.down);
	});

	test('a half sheet travels from the split, so its range is shorter by its margin', () => {
		expect(getSheetTranslate({ from: 'half', linePx: lines.raised, lines })).toBe(-lines.half);
		expect(getSheetTranslate({ from: 'half', linePx: lines.down, lines })).toBe(
			lines.down - lines.half,
		);
	});

	test('a slide ends where the rest it lands on draws the pane', () => {
		expect(getSheetSlide({ ...slide, from: 'raised', to: 'down' })).toEqual({
			clipPx: undefined,
			translatePx: lines.down,
		});
		expect(getSheetSlide({ ...slide, from: 'half', to: 'raised' })).toEqual({
			clipPx: undefined,
			translatePx: -lines.half,
		});
		expect(getSheetSlide({ ...slide, from: 'down', to: 'half' })).toEqual({
			clipPx: undefined,
			translatePx: lines.half,
		});
	});

	test('raising from half at the end of a page stops short by what the scroll offset gives back', () => {
		const atEnd = { ...slide, foldPx: scrollMaxY, scrollY: scrollMaxY };

		expect(getSheetSlide({ ...atEnd, from: 'half', to: 'raised' })).toEqual({
			clipPx: scrollMaxY - lines.half,
			translatePx: 0,
		});
		expect(
			getSheetSlide({ ...atEnd, foldPx: 1900, from: 'half', scrollY: 1900, to: 'raised' }),
		).toEqual({ clipPx: 1900 - 220, translatePx: -lines.half + 220 });
	});

	test('only a margin leaving clamps: a raised or lowering sheet slides the whole way', () => {
		const atEnd = { ...slide, foldPx: scrollMaxY, scrollY: scrollMaxY };

		expect(getSheetSlide({ ...atEnd, from: 'half', to: 'down' }).clipPx).toBeUndefined();
		expect(getSheetSlide({ ...atEnd, from: 'down', to: 'raised' })).toEqual({
			clipPx: undefined,
			translatePx: 0,
		});
	});
});

describe('getSheetTapRest', () => {
	test('a tap hides the page from either open rest', () => {
		expect(getSheetTapRest({ from: 'raised', preferred: 'half' })).toBe('down');
		expect(getSheetTapRest({ from: 'half', preferred: 'raised' })).toBe('down');
	});

	test('a tap on a lowered sheet shows the page at the preferred rest', () => {
		expect(getSheetTapRest({ from: 'down', preferred: 'half' })).toBe('half');
		expect(getSheetTapRest({ from: 'down', preferred: 'raised' })).toBe('raised');
	});
});

describe('getSheetStepRest', () => {
	const rests = getSheetRests(true);

	test('an arrow key steps one rest, so the keyboard reaches the open rest a tap skips', () => {
		expect(getSheetStepRest({ direction: 'up', from: 'down', rests })).toBe('half');
		expect(getSheetStepRest({ direction: 'up', from: 'half', rests })).toBe('raised');
		expect(getSheetStepRest({ direction: 'down', from: 'raised', rests })).toBe('half');
		expect(getSheetStepRest({ direction: 'down', from: 'half', rests })).toBe('down');
	});

	test('a step past either end stays', () => {
		expect(getSheetStepRest({ direction: 'up', from: 'raised', rests })).toBe('raised');
		expect(getSheetStepRest({ direction: 'down', from: 'down', rests })).toBe('down');
	});

	test('without the half rest a step crosses to the other rest', () => {
		const twoRests = getSheetRests(false);

		expect(getSheetStepRest({ direction: 'up', from: 'down', rests: twoRests })).toBe('raised');
		expect(getSheetStepRest({ direction: 'down', from: 'raised', rests: twoRests })).toBe('down');
	});
});

describe('getPreferredSheetRest', () => {
	test('a stored open rest is the preference', () => {
		expect(getPreferredSheetRest({ hasHalf: true, stored: 'raised' })).toBe('raised');
		expect(getPreferredSheetRest({ hasHalf: true, stored: 'half' })).toBe('half');
	});

	test('with nothing usable stored the preference is half', () => {
		expect(getPreferredSheetRest({ hasHalf: true, stored: undefined })).toBe('half');
		expect(getPreferredSheetRest({ hasHalf: true, stored: 'down' })).toBe('half');
	});

	test('where the height gate fails every preference is raised', () => {
		expect(getPreferredSheetRest({ hasHalf: false, stored: 'half' })).toBe('raised');
		expect(getPreferredSheetRest({ hasHalf: false, stored: undefined })).toBe('raised');
	});
});

describe('getSheetArrivalRest', () => {
	const map = { layout: 'map' } as const;
	const raised = { layout: 'sheet', rest: 'raised' } as const;
	const half = { layout: 'sheet', rest: 'half' } as const;
	const down = { layout: 'sheet', rest: 'down' } as const;
	const others = [{ layout: 'regular' }, { layout: 'split' }] as const;
	const froms = [map, raised, half, down, ...others];

	test('a stored preference decides every arrival', () => {
		for (const from of froms) {
			expect(getSheetArrivalRest({ from, hasHalf: true, stored: 'raised' })).toBe('raised');
			expect(getSheetArrivalRest({ from, hasHalf: true, stored: 'half' })).toBe('half');
		}
	});

	test('with none stored, the map and a lowered sheet arrive at half', () => {
		expect(getSheetArrivalRest({ from: map, hasHalf: true, stored: undefined })).toBe('half');
		expect(getSheetArrivalRest({ from: down, hasHalf: true, stored: undefined })).toBe('half');
	});

	test('with none stored, a sheet keeps the open rest it left', () => {
		expect(getSheetArrivalRest({ from: half, hasHalf: true, stored: undefined })).toBe('half');
		expect(getSheetArrivalRest({ from: raised, hasHalf: true, stored: undefined })).toBe('raised');
	});

	test('with none stored, a page with no sheet arrives raised', () => {
		for (const from of others) {
			expect(getSheetArrivalRest({ from, hasHalf: true, stored: undefined })).toBe('raised');
		}
	});

	test('where the height gate fails every arrival is raised', () => {
		for (const from of froms) {
			expect(getSheetArrivalRest({ from, hasHalf: false, stored: 'half' })).toBe('raised');
		}
	});
});

describe('isSheetArrivalAtStart', () => {
	const arrival = { hasHash: false, navigationType: 'push', rest: 'half', scrollY: 0 } as const;

	test('a fresh arrival at half starts at the split', () => {
		expect(isSheetArrivalAtStart(arrival)).toBe(true);
	});

	test('a place the reader or the address already chose is left alone', () => {
		expect(isSheetArrivalAtStart({ ...arrival, navigationType: 'traverse' })).toBe(false);
		expect(isSheetArrivalAtStart({ ...arrival, hasHash: true })).toBe(false);
		expect(isSheetArrivalAtStart({ ...arrival, scrollY: 300 })).toBe(false);
	});

	test('only a half sheet has a split to start at', () => {
		expect(isSheetArrivalAtStart({ ...arrival, rest: 'raised' })).toBe(false);
		expect(isSheetArrivalAtStart({ ...arrival, rest: 'down' })).toBe(false);
	});
});
