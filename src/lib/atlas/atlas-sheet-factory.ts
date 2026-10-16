import type { AtlasSheetRest } from '#lib/atlas/atlas-layout-factory.ts';

import { atlasSheetRest } from '#lib/atlas/atlas-constants.ts';

export type AtlasSheetLines = Record<AtlasSheetRest, number>;

const moveViewportShare = 0.2;

const restOrder = [atlasSheetRest.raised, atlasSheetRest.half, atlasSheetRest.down] as const;

export function getSheetRests(hasHalf: boolean): Array<AtlasSheetRest> {
	return restOrder.filter((rest) => hasHalf || rest !== atlasSheetRest.half);
}

export function getSheetDragLine({
	deltaY,
	from,
	lines,
}: {
	deltaY: number;
	from: AtlasSheetRest;
	lines: AtlasSheetLines;
}) {
	return Math.min(lines.down, Math.max(lines.raised, lines[from] + deltaY));
}

function getMarginPx(from: AtlasSheetRest, lines: AtlasSheetLines) {
	return from === atlasSheetRest.half ? lines.half : 0;
}

export function getSheetFold({ linePx, paneTop }: { linePx: number; paneTop: number }) {
	return Math.max(0, linePx - paneTop);
}

export function getSheetTranslate({
	from,
	linePx,
	lines,
}: {
	from: AtlasSheetRest;
	linePx: number;
	lines: AtlasSheetLines;
}) {
	// Less the half margin, so a grab draws the same frame as the half rest it left
	return linePx - getMarginPx(from, lines);
}

export function getSheetSlide({
	foldPx,
	from,
	lines,
	scrollMaxY,
	scrollY,
	to,
}: {
	foldPx: number;
	from: AtlasSheetRest;
	lines: AtlasSheetLines;
	scrollMaxY: number;
	scrollY: number;
	to: AtlasSheetRest;
}) {
	const marginPx = getMarginPx(from, lines);
	const translatePx = getSheetTranslate({ from, linePx: lines[to], lines });

	if (to !== atlasSheetRest.raised) return { clipPx: undefined, translatePx };

	// Leaving half drops the margin, so near a page's end the scroll clamps and raised stops short
	const clampPx = Math.min(marginPx, Math.max(0, scrollY - (scrollMaxY - marginPx)));

	if (clampPx === 0) return { clipPx: undefined, translatePx };

	return { clipPx: foldPx - clampPx, translatePx: translatePx + clampPx };
}

function getNearestRest({
	from,
	linePx,
	lines,
	rests,
}: {
	from: AtlasSheetRest;
	linePx: number;
	lines: AtlasSheetLines;
	rests: Array<AtlasSheetRest>;
}) {
	const isDownward = linePx > lines[from];
	let nearest = from;
	let nearestPx = Infinity;

	for (const rest of rests) {
		const isAhead = isDownward ? lines[rest] > lines[from] : lines[rest] < lines[from];
		const distancePx = Math.abs(lines[rest] - linePx);

		if (!(isAhead && distancePx < nearestPx)) {
			continue;
		}

		nearest = rest;
		nearestPx = distancePx;
	}

	return nearest;
}

export function getSheetTapRest({
	from,
	preferred,
}: {
	from: AtlasSheetRest;
	preferred: AtlasSheetRest;
}) {
	return from === atlasSheetRest.down ? preferred : atlasSheetRest.down;
}

export type AtlasSheetReleaseKind = 'cancel' | 'drag' | 'tap';

export function getSheetReleaseRest({
	from,
	kind,
	linePx,
	lines,
	preferred,
	rests,
	viewportHeight,
}: {
	from: AtlasSheetRest;
	kind: AtlasSheetReleaseKind;
	linePx: number;
	lines: AtlasSheetLines;
	preferred: AtlasSheetRest;
	rests: Array<AtlasSheetRest>;
	viewportHeight: number;
}) {
	if (kind === 'cancel') return from;
	if (kind === 'tap') return getSheetTapRest({ from, preferred });

	if (Math.abs(linePx - lines[from]) < viewportHeight * moveViewportShare) return from;

	return getNearestRest({ from, linePx, lines, rests });
}

export function getSheetStepRest({
	direction,
	from,
	rests,
}: {
	direction: 'down' | 'up';
	from: AtlasSheetRest;
	rests: Array<AtlasSheetRest>;
}) {
	const index = rests.indexOf(from) + (direction === 'up' ? -1 : 1);

	return rests[index] ?? from;
}

function isOpenRest(value: unknown): value is Exclude<AtlasSheetRest, 'down'> {
	return value === atlasSheetRest.half || value === atlasSheetRest.raised;
}

export function getPreferredSheetRest({
	hasHalf,
	stored,
}: {
	hasHalf: boolean;
	stored: string | undefined;
}) {
	if (!hasHalf) return atlasSheetRest.raised;

	return isOpenRest(stored) ? stored : atlasSheetRest.half;
}

export function getSheetEnterRest(hasHalf: boolean) {
	return hasHalf ? atlasSheetRest.half : atlasSheetRest.down;
}

export function isSheetArrivalAtStart({
	hasHash,
	navigationType,
	rest,
	scrollY,
}: {
	hasHash: boolean;
	navigationType: string;
	rest: AtlasSheetRest;
	scrollY: number;
}) {
	return rest === atlasSheetRest.half && navigationType !== 'traverse' && !hasHash && scrollY <= 0;
}
