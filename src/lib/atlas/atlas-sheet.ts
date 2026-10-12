import {
	atlasPaneSelector,
	atlasSheetAttribute,
	atlasSheetDown,
	atlasSheetFoldProperty,
	atlasSheetGrabbingAttribute,
} from '#lib/atlas/atlas-constants.ts';
import { getSheetDragOffset } from '#lib/atlas/atlas-sheet-factory.ts';
import { dispatchSync } from '#lib/atlas/atlas-sync.ts';

const sheetMoveDurationMs = 200;

let currentDrag: object | undefined;
let currentMove: Animation | undefined;

function getPane() {
	return document.querySelector<HTMLElement>(atlasPaneSelector) ?? undefined;
}

function getRestPx(pane: HTMLElement) {
	const [, restPx] = getComputedStyle(pane).translate.split(' ', 2);

	return restPx ? Number(restPx.replace('px', '')) : 0;
}

function setSheetDown(isDown: boolean) {
	const root = document.documentElement;
	const wasDown = isSheetDown();

	if (isDown) {
		root.setAttribute(atlasSheetAttribute, atlasSheetDown);
	} else {
		root.removeAttribute(atlasSheetAttribute);
		root.style.removeProperty(atlasSheetFoldProperty);
	}

	getPane()?.removeAttribute(atlasSheetGrabbingAttribute);

	if (isDown !== wasDown) dispatchSync();
}

function holdSheet() {
	const pane = getPane();

	if (!pane || pane.getAnimations().length > 0) return;
	if (pane.hasAttribute(atlasSheetGrabbingAttribute)) return pane;

	if (!isSheetDown()) {
		const foldPx = Math.max(0, -pane.getBoundingClientRect().top);

		document.documentElement.style.setProperty(atlasSheetFoldProperty, `${String(foldPx)}px`);
	}

	pane.toggleAttribute(atlasSheetGrabbingAttribute, true);

	return pane;
}

export function isSheetDown() {
	return document.documentElement.getAttribute(atlasSheetAttribute) === atlasSheetDown;
}

export function isSheetGrabbed() {
	return getPane()?.hasAttribute(atlasSheetGrabbingAttribute) ?? false;
}

export function resetSheet() {
	const pane = getPane();

	currentMove?.cancel();
	currentMove = undefined;
	currentDrag = undefined;

	if (pane) pane.style.translate = '';

	setSheetDown(false);
}

export async function moveSheet(isDown: boolean) {
	const pane = holdSheet();

	if (!pane) return;

	const isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

	const move = pane.animate(
		{ translate: isDown ? '0 var(--atlas-sheet-rest)' : '0 0' },
		{
			duration: isReducedMotion ? 0 : sheetMoveDurationMs,
			easing: isDown ? 'ease-in' : 'ease-out',
			fill: 'forwards',
		},
	);

	currentDrag = undefined;
	currentMove = move;

	try {
		await move.finished;
	} catch {
		return;
	}

	if (move !== currentMove || !pane.isConnected) return;

	setSheetDown(isDown);
	pane.style.translate = '';
	move.cancel();
}

export function grabSheet() {
	const pane = holdSheet();

	if (!pane) return;

	const restPx = getRestPx(pane);

	const drag = {
		move(offsetPx: number) {
			if (drag !== currentDrag) return 0;

			const translatePx = getSheetDragOffset({ deltaY: offsetPx, restPx });

			pane.style.translate = `0 ${String(translatePx)}px`;

			return Math.abs(translatePx - restPx);
		},
		release(isDown: boolean) {
			if (drag !== currentDrag) return false;

			void moveSheet(isDown);

			return true;
		},
	};

	currentDrag = drag;

	return drag;
}
