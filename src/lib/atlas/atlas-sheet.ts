import { atlasPaneSelector, atlasSheetFoldProperty } from '#lib/atlas/atlas-constants.ts';
import { dispatchSync } from '#lib/atlas/atlas-sync.ts';

const sheetMoveDurationMs = 200;

export function isSheetDown() {
	return document.documentElement.dataset.atlasSheet === 'down';
}

export function setSheetDown(isDown: boolean) {
	const root = document.documentElement;
	const wasDown = isSheetDown();

	if (isDown) {
		root.dataset.atlasSheet = 'down';
	} else {
		delete root.dataset.atlasSheet;
		root.style.removeProperty(atlasSheetFoldProperty);
	}

	document.querySelector(atlasPaneSelector)?.removeAttribute('data-grabbing');

	if (isDown !== wasDown) dispatchSync();
}

export function grabSheet() {
	const pane = document.querySelector<HTMLElement>(atlasPaneSelector);

	if (!pane || pane.getAnimations().length > 0) return;
	if ('grabbing' in pane.dataset) return pane;

	if (!isSheetDown()) {
		const foldPx = Math.max(0, -pane.getBoundingClientRect().top);

		document.documentElement.style.setProperty(atlasSheetFoldProperty, `${String(foldPx)}px`);
	}

	pane.toggleAttribute('data-grabbing', true);

	return pane;
}

export async function moveSheet(isDown: boolean) {
	const pane = grabSheet();

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

	await move.finished;

	if (!pane.isConnected) return;

	setSheetDown(isDown);
	pane.style.translate = '';
	move.cancel();
}
