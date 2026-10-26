import { describe, expect, test } from 'vitest';

import {
	getPreferredSheetRest,
	getSheetDragLine,
	getSheetReleaseRest,
	getSheetRests,
	getSheetSlide,
	getSheetStepRest,
	getSheetTapRest,
	getSheetTranslate,
	isSheetArrivalAtStart,
} from '#lib/atlas/atlas-sheet-factory.ts';

const lines = { half: 320, lowered: 776, raised: 0 };
const viewportHeight = 800;

describe('getSheetDragLine', () => {
	test.each([
		['raised', 300, 300],
		['raised', -40, 0],
		['raised', 5000, 776],
		['half', -200, 120],
		['half', 200, 520],
		['lowered', 60, 776],
		['lowered', -200, 576],
		['lowered', -2000, 0],
	] as const)(
		'a %s sheet dragged %i follows the pointer to %i, between the raised and lowered lines',
		(from, deltaY, expected) => {
			expect(getSheetDragLine({ deltaY, from, lines })).toBe(expected);
		},
	);
});

describe('getSheetReleaseRest', () => {
	const rests = getSheetRests(true);
	const drag = { kind: 'drag', lines, preferred: 'half', rests, viewportHeight } as const;

	function getRest(from: 'half' | 'lowered' | 'raised', linePx: number, dragRests = rests) {
		return getSheetReleaseRest({ ...drag, from, linePx, rests: dragRests });
	}

	test('a drag leaves its rest from a fifth of the viewport height, in either direction', () => {
		expect(getRest('raised', 159)).toBe('raised');
		expect(getRest('raised', 160)).toBe('half');
		expect(getRest('half', 320 - 159)).toBe('half');
		expect(getRest('half', 320 - 160)).toBe('raised');
		expect(getRest('half', 320 + 159)).toBe('half');
		expect(getRest('half', 320 + 160)).toBe('lowered');
		expect(getRest('lowered', 776 - 159)).toBe('lowered');
		expect(getRest('lowered', 776 - 160)).toBe('half');
		expect(getRest('lowered', getSheetDragLine({ deltaY: 400, from: 'lowered', lines }))).toBe(
			'lowered',
		);
	});

	test('a long pull skips half for the rest nearer the release point', () => {
		expect(getRest('raised', 547)).toBe('half');
		expect(getRest('raised', 549)).toBe('lowered');
		expect(getRest('lowered', 161)).toBe('half');
		expect(getRest('lowered', 159)).toBe('raised');
	});

	test('a release never lands behind the rest the drag started from', () => {
		expect(getRest('half', 0)).toBe('raised');
		expect(getRest('half', 776)).toBe('lowered');
	});

	test('without the half rest a committed drag crosses to the other rest', () => {
		const twoRests = getSheetRests(false);

		expect(getRest('raised', 160, twoRests)).toBe('lowered');
		expect(getRest('raised', 159, twoRests)).toBe('raised');
		expect(getRest('lowered', 776 - 160, twoRests)).toBe('raised');
	});

	test('a tap or a cancelled pointer ignores the line it ended on', () => {
		const tap = { ...drag, kind: 'tap', linePx: 600 } as const;

		expect(getSheetReleaseRest({ ...tap, from: 'half' })).toBe('lowered');
		expect(getSheetReleaseRest({ ...tap, from: 'lowered', preferred: 'raised' })).toBe('raised');
		expect(getSheetReleaseRest({ ...tap, from: 'raised', kind: 'cancel' })).toBe('raised');
	});
});

describe('the frame a moving sheet draws', () => {
	const scrollY = 500;
	const scrollMaxY = 2000;
	const slide = { foldPx: scrollY, lines, scrollMaxY, scrollY };

	test.each([
		['raised', lines.raised, 0],
		['half', lines.half, 0],
		['lowered', lines.lowered, lines.lowered],
		['half', lines.raised, -lines.half],
		['half', lines.lowered, lines.lowered - lines.half],
	] as const)(
		'a %s sheet at line %i translates %i, a half sheet travelling from the split',
		(from, linePx, expected) => {
			expect(getSheetTranslate({ from, linePx, lines })).toBe(expected);
		},
	);

	test('a slide ends where the rest it lands on draws the pane', () => {
		expect(getSheetSlide({ ...slide, from: 'raised', to: 'lowered' })).toEqual({
			clipPx: undefined,
			translatePx: lines.lowered,
		});
		expect(getSheetSlide({ ...slide, from: 'half', to: 'raised' })).toEqual({
			clipPx: undefined,
			translatePx: -lines.half,
		});
		expect(getSheetSlide({ ...slide, from: 'lowered', to: 'half' })).toEqual({
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

		expect(getSheetSlide({ ...atEnd, from: 'half', to: 'lowered' }).clipPx).toBeUndefined();
		expect(getSheetSlide({ ...atEnd, from: 'lowered', to: 'raised' })).toEqual({
			clipPx: undefined,
			translatePx: 0,
		});
	});
});

describe('getSheetTapRest', () => {
	test.each([
		['raised', 'half', 'lowered'],
		['half', 'raised', 'lowered'],
		['lowered', 'half', 'half'],
		['lowered', 'raised', 'raised'],
	] as const)('a tap on a %s sheet, preferring %s, rests at %s', (from, preferred, expected) => {
		expect(getSheetTapRest({ from, preferred })).toBe(expected);
	});
});

describe('getSheetStepRest', () => {
	const rests = getSheetRests(true);

	test.each([
		{ direction: 'up', expected: 'half', from: 'lowered', hasHalf: true },
		{ direction: 'up', expected: 'raised', from: 'half', hasHalf: true },
		{ direction: 'down', expected: 'half', from: 'raised', hasHalf: true },
		{ direction: 'down', expected: 'lowered', from: 'half', hasHalf: true },
		{ direction: 'up', expected: 'raised', from: 'lowered', hasHalf: false },
		{ direction: 'down', expected: 'lowered', from: 'raised', hasHalf: false },
	] as const)(
		'an arrow key $direction from $from (half rest: $hasHalf) steps one rest to $expected',
		({ direction, expected, from, hasHalf }) => {
			expect(getSheetStepRest({ direction, from, rests: getSheetRests(hasHalf) })).toBe(expected);
		},
	);

	test('a step past either end stays', () => {
		expect(getSheetStepRest({ direction: 'up', from: 'raised', rests })).toBe('raised');
		expect(getSheetStepRest({ direction: 'down', from: 'lowered', rests })).toBe('lowered');
	});
});

describe('getPreferredSheetRest', () => {
	test.each([
		[true, 'raised', 'raised'],
		[true, 'half', 'half'],
		[true, undefined, 'half'],
		[true, 'lowered', 'half'],
		[false, 'half', 'raised'],
		[false, undefined, 'raised'],
	] as const)(
		'with the half rest %s and %s stored, every arrival is %s',
		(hasHalf, stored, expected) => {
			expect(getPreferredSheetRest({ hasHalf, stored })).toBe(expected);
		},
	);
});

describe('isSheetArrivalAtStart', () => {
	const arrival = { hasHash: false, navigationType: 'push', rest: 'half', scrollY: 0 } as const;

	test.each([
		['a fresh arrival at half', true, {}],
		['a traversal', false, { navigationType: 'traverse' }],
		['an address with a hash', false, { hasHash: true }],
		['a page already scrolled', false, { scrollY: 300 }],
		['a raised sheet', false, { rest: 'raised' }],
		['a lowered sheet', false, { rest: 'lowered' }],
	] as const)('%s starts at the split: %s', (_label, expected, overrides) => {
		expect(isSheetArrivalAtStart({ ...arrival, ...overrides })).toBe(expected);
	});
});
