import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

import type { AtlasSheetRest } from '#lib/atlas/atlas-layout-factory.ts';
import type { AtlasSheetLines, AtlasSheetReleaseKind } from '#lib/atlas/atlas-sheet-factory.ts';

import {
	atlasPaneMainSelector,
	atlasPaneSelector,
	atlasSheetAttribute,
	atlasSheetFoldProperty,
	atlasSheetGrabbingAttribute,
	atlasSheetHalfLineProperty,
	atlasSheetHalfProperty,
	atlasSheetHandleSelector,
	atlasSheetLoweredLineProperty,
	atlasSheetRest,
	atlasSheetRestStorageKey,
	atlasSheetStartSelector,
} from '#lib/atlas/atlas-constants.ts';
import {
	getPreferredSheetRest,
	getSheetDragLine,
	getSheetEnterRest,
	getSheetFold,
	getSheetReleaseRest,
	getSheetRests,
	getSheetSlide,
	getSheetTranslate,
	isSheetArrivalAtStart,
} from '#lib/atlas/atlas-sheet-factory.ts';
import { readStorage, writeStorage } from '#lib/utils/storage.ts';

const sheetMoveDurationMs = { lower: 150, raise: 200 } as const;

let currentDrag: object | undefined;
let currentMove: Animation | undefined;

function getPane() {
	return document.querySelector<HTMLElement>(atlasPaneSelector) ?? undefined;
}

function readLengthPx(property: string) {
	const length = getComputedStyle(document.documentElement).getPropertyValue(property);

	return Number(length.replace('px', '')) || 0;
}

export function hasHalfRest() {
	const value = getComputedStyle(document.documentElement).getPropertyValue(atlasSheetHalfProperty);

	return value.trim() === '1';
}

export function readSheetRest(): AtlasSheetRest {
	const value = document.documentElement.getAttribute(atlasSheetAttribute);

	if (value === atlasSheetRest.lowered || value === atlasSheetRest.half) return value;

	return atlasSheetRest.raised;
}

function readLines(): AtlasSheetLines {
	return {
		half: readLengthPx(atlasSheetHalfLineProperty),
		lowered: readLengthPx(atlasSheetLoweredLineProperty),
		raised: 0,
	};
}

function writeRest(root: HTMLElement, rest: AtlasSheetRest) {
	if (rest === atlasSheetRest.raised) {
		root.removeAttribute(atlasSheetAttribute);
		return;
	}

	root.setAttribute(atlasSheetAttribute, rest);
}

function readFoldPx() {
	const fold = document.documentElement.style.getPropertyValue(atlasSheetFoldProperty);

	return Number(fold.replace('px', '')) || 0;
}

// Written once per grab or slide and kept while lowered; scrolling the window under it breaks the clip
function writeFoldPx(linePx: number, paneTop: number) {
	const foldPx = getSheetFold({ linePx, paneTop });

	document.documentElement.style.setProperty(atlasSheetFoldProperty, `${String(foldPx)}px`);
}

function releaseFragmentScroll() {
	if (document.readyState === 'complete' || location.hash === '') return;

	const top = window.scrollY;

	window.scrollTo({ behavior: 'instant', top: top > 0 ? top - 1 : top + 1 });
	window.scrollTo({ behavior: 'instant', top });
}

export function setSheet(rest: AtlasSheetRest) {
	const root = document.documentElement;
	const pane = getPane();
	const from = readSheetRest();

	writeRest(root, rest);

	if (rest !== atlasSheetRest.lowered) {
		root.style.removeProperty(atlasSheetFoldProperty);
	} else if (pane && from !== atlasSheetRest.lowered) {
		// Read once the attribute has landed: the margin leaving can clamp the scroll offset at the end of a page
		writeFoldPx(0, pane.offsetTop - window.scrollY);
	}

	pane?.removeAttribute(atlasSheetGrabbingAttribute);
}

function holdSheet(lines: AtlasSheetLines) {
	const pane = getPane();

	if (!pane || pane.getAnimations().length > 0) return;
	if (pane.hasAttribute(atlasSheetGrabbingAttribute)) return pane;

	const from = readSheetRest();

	releaseFragmentScroll();

	if (from !== atlasSheetRest.lowered) writeFoldPx(lines[from], pane.getBoundingClientRect().top);

	pane.toggleAttribute(atlasSheetGrabbingAttribute, true);

	return pane;
}

export function readSheetRests() {
	return getSheetRests(hasHalfRest());
}

export function readPreferredSheetRest() {
	return getPreferredSheetRest({
		hasHalf: hasHalfRest(),
		stored: readStorage('localStorage', atlasSheetRestStorageKey),
	});
}

export function readSheetEnterRest() {
	return getSheetEnterRest(hasHalfRest());
}

export function storeSheetRest(rest: AtlasSheetRest) {
	if (rest === atlasSheetRest.lowered) return;

	writeStorage('localStorage', atlasSheetRestStorageKey, rest);
}

export function isSheetGrabbed() {
	return getPane()?.hasAttribute(atlasSheetGrabbingAttribute) ?? false;
}

export function scrollToSheetStart(
	behavior: ScrollBehavior,
	element = document.querySelector(atlasSheetStartSelector) ??
		document.querySelector(atlasPaneMainSelector),
) {
	if (!element) return;

	const handle = document.querySelector(atlasSheetHandleSelector);
	const startPx = readLengthPx(atlasSheetHalfLineProperty) + (handle?.clientHeight ?? 0);

	window.scrollBy({ behavior, top: element.getBoundingClientRect().top - startPx });
}

function startSheetArrival(navigationType: string) {
	const isAtStart = isSheetArrivalAtStart({
		hasHash: location.hash !== '',
		navigationType,
		rest: readSheetRest(),
		scrollY: window.scrollY,
	});

	if (isAtStart) scrollToSheetStart('instant');
}

export function prepareSheetArrival(event: TransitionBeforeSwapEvent, isSheet: boolean) {
	const incomingRoot = event.newDocument.documentElement;

	writeRest(incomingRoot, isSheet ? readPreferredSheetRest() : atlasSheetRest.raised);

	document.addEventListener(
		'astro:after-swap',
		() => {
			startSheetArrival(event.navigationType);
		},
		{ once: true },
	);
}

export function startColdSheetArrival() {
	const [entry] = performance.getEntriesByType('navigation');
	const isNavigate = entry instanceof PerformanceNavigationTiming && entry.type === 'navigate';

	startSheetArrival(isNavigate ? 'push' : 'traverse');
}

export function resetSheet() {
	const pane = getPane();

	currentMove?.cancel();
	currentMove = undefined;
	currentDrag = undefined;

	if (pane) pane.style.translate = '';

	setSheet(atlasSheetRest.raised);
}

function getMoveKeyframe(from: AtlasSheetRest, to: AtlasSheetRest, lines: AtlasSheetLines) {
	const root = document.documentElement;
	const { clipPx, translatePx } = getSheetSlide({
		foldPx: readFoldPx(),
		from,
		lines,
		scrollMaxY: root.scrollHeight - root.clientHeight,
		scrollY: window.scrollY,
		to,
	});
	const translate = `0 ${String(translatePx)}px`;

	if (clipPx === undefined) return { translate };

	return { clipPath: `inset(${String(clipPx)}px 0 0 0)`, translate };
}

function getMoveDuration(rest: AtlasSheetRest) {
	if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;

	return rest === atlasSheetRest.lowered ? sheetMoveDurationMs.lower : sheetMoveDurationMs.raise;
}

function slidePane(pane: HTMLElement, keyframe: PropertyIndexedKeyframes, rest: AtlasSheetRest) {
	return pane.animate(keyframe, {
		duration: getMoveDuration(rest),
		easing: rest === atlasSheetRest.lowered ? 'ease-in' : 'ease-out',
		fill: 'forwards',
	});
}

// Takes the rest as asked; callers pick one the height gate allows from `atlas-sheet-factory.ts`
export async function moveSheet(rest: AtlasSheetRest) {
	const from = readSheetRest();

	if (rest === from && !isSheetGrabbed()) return;

	const lines = readLines();
	const pane = holdSheet(lines);

	if (!pane) return;

	const move = slidePane(pane, getMoveKeyframe(from, rest, lines), rest);

	currentDrag = undefined;
	currentMove = move;

	try {
		await move.finished;
	} catch {
		return;
	}

	// Only the current slide writes the rest; `resetSheet` may have cancelled it or another replaced it
	if (move !== currentMove || !pane.isConnected) return;

	// The rest lands while the fill still holds the pane, then the slide lets go in the same task
	setSheet(rest);
	pane.style.translate = '';
	move.cancel();
}

export function grabSheet() {
	const lines = readLines();
	const pane = holdSheet(lines);

	if (!pane) return;

	const from = readSheetRest();
	const rests = readSheetRests();
	let linePx = lines[from];

	const drag = {
		move(offsetPx: number) {
			if (drag !== currentDrag) return;

			linePx = getSheetDragLine({ deltaY: offsetPx, from, lines });
			pane.style.translate = `0 ${String(getSheetTranslate({ from, linePx, lines }))}px`;
		},
		release(kind: AtlasSheetReleaseKind) {
			if (drag !== currentDrag) return;

			const rest = getSheetReleaseRest({
				from,
				kind,
				linePx,
				lines,
				preferred: readPreferredSheetRest(),
				rests,
				viewportHeight: window.innerHeight,
			});

			void moveSheet(rest);

			return rest === from ? undefined : rest;
		},
	};

	currentDrag = drag;

	return drag;
}
