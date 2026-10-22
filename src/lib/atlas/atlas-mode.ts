import { mapSyncEventName } from '@spectralcodex/react-map-component/constants';

import type { AtlasPaneLayout, AtlasScreen } from '#lib/atlas/atlas-layout-factory.ts';

import {
	atlasFlagAttribute,
	atlasFlagStorageKey,
	atlasFromAttribute,
	atlasPage,
	atlasPaneLayoutProperty,
	atlasPaneMainSelector,
	atlasPaneSelector,
	atlasPersistName,
	atlasSheetRest,
	atlasShellSelector,
} from '#lib/atlas/atlas-constants.ts';
import { getAtlasLayout, readAtlasFlags } from '#lib/atlas/atlas-layout-factory.ts';
import { stampPaneSize, updateHeroSizes } from '#lib/atlas/atlas-pane.ts';
import {
	hasHalfRest,
	prepareSheetArrival,
	readSheetRest,
	resetSheet,
	startColdSheetArrival,
} from '#lib/atlas/atlas-sheet.ts';
import { readStorage, writeStorage } from '#lib/utils/storage.ts';

const paneAnchorSelector = `${atlasPaneSelector} a[href]`;

function readPaneLayout(): AtlasPaneLayout {
	const value = getComputedStyle(document.documentElement).getPropertyValue(
		atlasPaneLayoutProperty,
	);

	return value.trim() === 'split' ? 'split' : 'sheet';
}

export function readAtlasLayout(root: HTMLElement = document.documentElement) {
	return getAtlasLayout({ ...readAtlasFlags(root), paneLayout: readPaneLayout() });
}

export function readAtlasScreen(): AtlasScreen {
	const layout = readAtlasLayout();

	return layout === 'sheet' ? { layout, rest: readSheetRest() } : { layout };
}

function dispatchSync() {
	document.dispatchEvent(new Event(mapSyncEventName));
}

function handleLinkClick(event: MouseEvent) {
	if (!(event.target instanceof Element)) return;

	const anchor = event.target.closest(paneAnchorSelector);

	if (!(anchor instanceof HTMLAnchorElement)) return;
	if (anchor.origin === location.origin || !anchor.protocol.startsWith('http')) return;

	if (readAtlasLayout() === 'split') anchor.target = '_blank';
	else anchor.removeAttribute('target');
}

function getSheetMainTop() {
	if (readPaneLayout() === 'split') return 0;

	return document.querySelector(atlasPaneMainSelector)?.getBoundingClientRect().top ?? 0;
}

export function setFlag(isEnabled: boolean) {
	// The header pads by the handle only while the flag is on, so the page is held by main's top
	const mainTop = getSheetMainTop();

	// Inside the measure, so a half rest's margin leaving does not move the page either
	if (!isEnabled) resetSheet();

	document.documentElement.toggleAttribute(atlasFlagAttribute, isEnabled);
	window.scrollBy({ behavior: 'instant', top: getSheetMainTop() - mainTop });

	writeStorage('sessionStorage', atlasFlagStorageKey, isEnabled ? '1' : undefined);
	updateHeroSizes(readAtlasLayout() === 'split');
	dispatchSync();
}

function getFromPage(screen: AtlasScreen) {
	const isLowered = screen.layout === 'sheet' && screen.rest === atlasSheetRest.lowered;

	return isLowered ? atlasPage.map : readAtlasFlags(document.documentElement).page;
}

async function clearFromWhenFinished(transition: ViewTransition) {
	await transition.finished;

	document.documentElement.removeAttribute(atlasFromAttribute);
}

// The setup script calls this on every page because bundled scripts do not run again after a swap
export function startAtlasMode() {
	let paneLayout = readPaneLayout();
	let hasHalf = hasHalfRest();

	// The setup script stamps a half rest before the stylesheet can say whether this screen has one
	if (readSheetRest() === atlasSheetRest.half && !(hasHalf && readAtlasLayout() === 'sheet')) {
		resetSheet();
	}

	window.addEventListener('resize', () => {
		const nextPaneLayout = readPaneLayout();
		const hasNextHalf = hasHalfRest();
		const isPaneLayoutChange = nextPaneLayout !== paneLayout;
		const isSplit = readAtlasLayout() === 'split';

		if (isSplit || isPaneLayoutChange) updateHeroSizes(isSplit);
		if (!isPaneLayoutChange && hasNextHalf === hasHalf) return;

		paneLayout = nextPaneLayout;
		hasHalf = hasNextHalf;

		if (isPaneLayoutChange || readSheetRest() === atlasSheetRest.half) resetSheet();

		dispatchSync();
	});

	document.addEventListener('click', handleLinkClick);

	window.addEventListener('pageshow', (event) => {
		if (!event.persisted) return;

		const isMap = readAtlasFlags(document.documentElement).page === atlasPage.map;

		setFlag(isMap || readStorage('sessionStorage', atlasFlagStorageKey) === '1');
	});

	// The swap copies the incoming root's attributes and inline style as they are, so the mode state is stamped here
	document.addEventListener('astro:before-swap', (event) => {
		const incomingRoot = event.newDocument.documentElement;
		const isMap = readAtlasFlags(incomingRoot).page === atlasPage.map;

		if (isMap) writeStorage('sessionStorage', atlasFlagStorageKey, '1');

		incomingRoot.toggleAttribute(
			atlasFlagAttribute,
			isMap || readAtlasFlags(document.documentElement).hasFlag,
		);
		stampPaneSize(incomingRoot);

		const from = getFromPage(readAtlasScreen());

		if (from) incomingRoot.setAttribute(atlasFromAttribute, from);

		const incomingLayout = readAtlasLayout(incomingRoot);

		prepareSheetArrival(event, incomingLayout === 'sheet');

		updateHeroSizes(incomingLayout === 'split', event.newDocument);

		void clearFromWhenFinished(event.viewTransition);

		// The swap drops a persisted shell unless the incoming page has a target for it
		// Never render a static placeholder here, since it would replace the real island on a later swap
		if (!document.querySelector(atlasShellSelector)) return;
		if (event.newDocument.querySelector(atlasShellSelector)) return;

		const target = event.newDocument.createElement('div');

		target.dataset.astroTransitionPersist = atlasPersistName;
		event.newDocument.body.append(target);
	});

	// Astro fires page-load 300 to 700ms later, and fitting the map then could close a menu the reader already opened
	document.addEventListener('astro:after-swap', dispatchSync);

	document.addEventListener('astro:page-load', startColdSheetArrival, { once: true });
}
