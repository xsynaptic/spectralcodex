import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';

import type { AtlasScreen, AtlasSheetRest } from '#lib/atlas/atlas-layout-factory.ts';
import type { AtlasSheetLines, AtlasSheetReleaseKind } from '#lib/atlas/atlas-sheet-factory.ts';

import {
	atlasPaneMainSelector,
	atlasPaneSelector,
	atlasSheetAttribute,
	atlasSheetFoldProperty,
	atlasSheetGrabbingAttribute,
	atlasSheetHalfMediaQuery,
	atlasSheetHandleSelector,
	atlasSheetRest,
	atlasSheetRestProperty,
	atlasSheetRestStorageKey,
	atlasSheetSplitProperty,
} from '#lib/atlas/atlas-constants.ts';
import { readAtlasLayout, readSheetRest } from '#lib/atlas/atlas-layout.ts';
import {
	getPreferredSheetRest,
	getSheetArrivalRest,
	getSheetDragLine,
	getSheetEnterRest,
	getSheetFold,
	getSheetReleaseRest,
	getSheetRests,
	getSheetSlide,
	getSheetTranslate,
	isSheetArrivalAtStart,
} from '#lib/atlas/atlas-sheet-factory.ts';

const sheetMoveDurationMs = 200;

let currentDrag: object | undefined;
let currentMove: Animation | undefined;

function getPane() {
	return document.querySelector<HTMLElement>(atlasPaneSelector) ?? undefined;
}

function readLengthPx(property: string) {
	const length = getComputedStyle(document.documentElement).getPropertyValue(property);

	return Number(length.replace('px', '')) || 0;
}

function hasHalfRest() {
	return matchMedia(atlasSheetHalfMediaQuery).matches;
}

function readLines(): AtlasSheetLines {
	return {
		down: readLengthPx(atlasSheetRestProperty),
		half: readLengthPx(atlasSheetSplitProperty),
		raised: 0,
	};
}

function readStoredRest() {
	try {
		return localStorage.getItem(atlasSheetRestStorageKey) ?? undefined;
	} catch {
		// localStorage unavailable
		return;
	}
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

function writeFoldPx(linePx: number, paneTop: number) {
	const foldPx = getSheetFold({ linePx, paneTop });

	document.documentElement.style.setProperty(atlasSheetFoldProperty, `${String(foldPx)}px`);
}

export function setSheet(rest: AtlasSheetRest) {
	const root = document.documentElement;
	const pane = getPane();
	const from = readSheetRest();

	writeRest(root, rest);

	if (rest !== atlasSheetRest.down) {
		root.style.removeProperty(atlasSheetFoldProperty);
	} else if (pane && from !== atlasSheetRest.down) {
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

	if (from !== atlasSheetRest.down) writeFoldPx(lines[from], pane.getBoundingClientRect().top);

	pane.toggleAttribute(atlasSheetGrabbingAttribute, true);

	return pane;
}

export function readSheetRests() {
	return getSheetRests(hasHalfRest());
}

export function readPreferredSheetRest() {
	return getPreferredSheetRest({ hasHalf: hasHalfRest(), stored: readStoredRest() });
}

export function readSheetEnterRest() {
	return getSheetEnterRest(hasHalfRest());
}

export function storeSheetRest(rest: AtlasSheetRest) {
	if (rest === atlasSheetRest.down) return;

	try {
		localStorage.setItem(atlasSheetRestStorageKey, rest);
	} catch {
		// localStorage unavailable
	}
}

export function isSheetGrabbed() {
	return getPane()?.hasAttribute(atlasSheetGrabbingAttribute) ?? false;
}

export function scrollToSheetStart(
	behavior: ScrollBehavior,
	element = document.querySelector(atlasPaneMainSelector),
) {
	if (!element) return;

	const handle = document.querySelector(atlasSheetHandleSelector);
	const startPx = readLengthPx(atlasSheetSplitProperty) + (handle?.clientHeight ?? 0);

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

export function prepareSheetArrival(event: TransitionBeforeSwapEvent, from: AtlasScreen) {
	const incomingRoot = event.newDocument.documentElement;
	const isSheet = readAtlasLayout(incomingRoot) === 'sheet';

	writeRest(
		incomingRoot,
		isSheet
			? getSheetArrivalRest({ from, hasHalf: hasHalfRest(), stored: readStoredRest() })
			: atlasSheetRest.raised,
	);

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

function slidePane(pane: HTMLElement, keyframe: PropertyIndexedKeyframes, rest: AtlasSheetRest) {
	return pane.animate(keyframe, {
		duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : sheetMoveDurationMs,
		easing: rest === atlasSheetRest.down ? 'ease-in' : 'ease-out',
		fill: 'forwards',
	});
}

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

	if (move !== currentMove || !pane.isConnected) return;

	setSheet(rest);
	// Firefox's scroll anchoring scrolls the page by the split unless the rest is laid out while the slide still holds the pane
	pane.getBoundingClientRect();
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
