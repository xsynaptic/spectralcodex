import {
	mapEnterEventName,
	mapExitEventName,
	mapExpandEventName,
	mapIntentEventName,
	mapSyncEventName,
} from '@spectralcodex/react-map-component/constants';
import { navigate } from 'astro:transitions/client';

import type { AtlasScreen } from '#lib/atlas/atlas-layout-factory.ts';

import {
	atlasFlagStorageKey,
	atlasInlineMapSelector,
	atlasPage,
	atlasPaneMainSelector,
	atlasPaneMediaQuery,
	atlasPaneSelector,
	atlasPaneSizeProperty,
	atlasPersistName,
	atlasReturnStorageKey,
	atlasSheetHalfMediaQuery,
	atlasSheetRest,
} from '#lib/atlas/atlas-constants.ts';
import { getAtlasExitAction } from '#lib/atlas/atlas-exit-factory.ts';
import { readAtlasLayout, readAtlasScreen, readSheetRest } from '#lib/atlas/atlas-layout.ts';
import { getAtlasOpenAction } from '#lib/atlas/atlas-open-factory.ts';
import { updateHeroSizes } from '#lib/atlas/atlas-pane.ts';
import {
	moveSheet,
	prepareSheetArrival,
	readPreferredSheetRest,
	readSheetEnterRest,
	resetSheet,
	scrollToSheetStart,
	setSheet,
	startColdSheetArrival,
} from '#lib/atlas/atlas-sheet.ts';
import { getSitePath } from '#lib/utils/routing.ts';

const paneAnchorSelector = `${atlasPaneSelector} a[href]`;
const shellSelector = `[data-astro-transition-persist="${atlasPersistName}"]`;

function dispatchSync() {
	document.dispatchEvent(new Event(mapSyncEventName));
}

// Following an outbound link in the same tab unloads the map; internal links swap into the pane
function updateExternalLinks() {
	const isSplit = readAtlasLayout() === 'split';

	for (const anchor of document.querySelectorAll<HTMLAnchorElement>(paneAnchorSelector)) {
		if (anchor.origin === location.origin || !anchor.protocol.startsWith('http')) continue;

		if (isSplit) anchor.target = '_blank';
		else anchor.removeAttribute('target');
	}
}

function updateSplit() {
	updateHeroSizes();
	updateExternalLinks();
}

function storeFlag(isEnabled: boolean) {
	try {
		if (isEnabled) sessionStorage.setItem(atlasFlagStorageKey, '1');
		else sessionStorage.removeItem(atlasFlagStorageKey);
	} catch {
		// sessionStorage unavailable
	}
}

function getSheetMainTop() {
	if (matchMedia(atlasPaneMediaQuery).matches) return 0;

	return document.querySelector(atlasPaneMainSelector)?.getBoundingClientRect().top ?? 0;
}

function setFlag(isEnabled: boolean) {
	const mainTop = getSheetMainTop();

	// Inside the measure, so a half rest's margin leaving does not move the page either
	if (!isEnabled) resetSheet();

	document.documentElement.toggleAttribute('data-atlas', isEnabled);
	window.scrollBy({ behavior: 'instant', top: getSheetMainTop() - mainTop });

	storeFlag(isEnabled);
	updateSplit();
	dispatchSync();
}

function getReturnPath() {
	try {
		return sessionStorage.getItem(atlasReturnStorageKey) ?? undefined;
	} catch {
		// sessionStorage unavailable
		return;
	}
}

function openSheet() {
	const rest = readSheetEnterRest();

	if (rest === atlasSheetRest.down) {
		void moveSheet(rest);
		return;
	}

	const inlineMap = document.querySelector(atlasInlineMapSelector);
	const next = inlineMap?.nextElementSibling ?? inlineMap?.parentElement?.nextElementSibling;

	setSheet(rest);

	if (next) scrollToSheetStart('instant', next);
}

function openAtlas() {
	if (document.fullscreenElement) void document.exitFullscreen();

	setFlag(true);

	document.querySelector<HTMLElement>(shellSelector)?.focus({ preventScroll: true });

	if (readAtlasLayout() === 'sheet') {
		openSheet();
		return;
	}

	window.scrollTo({ behavior: 'instant', top: 0 });
}

function runExitAction(action: ReturnType<typeof getAtlasExitAction>) {
	if (action.type === 'back') {
		history.back();
		return;
	}

	void navigate(action.path, { history: action.type });
}

function runOpenAction(action: ReturnType<typeof getAtlasOpenAction>) {
	switch (action.type) {
		case 'navigate': {
			void navigate(action.url);
			break;
		}
		case 'none': {
			break;
		}
		case 'raise': {
			void moveSheet(readPreferredSheetRest());
			break;
		}
		case 'start': {
			scrollToSheetStart('smooth');
			break;
		}
		case 'top': {
			window.scrollTo({ top: 0 });
			break;
		}
	}
}

async function closeAtlas() {
	if (readSheetRest() === atlasSheetRest.down) await moveSheet(atlasSheetRest.raised);

	const hasShellFocus = document.querySelector(shellSelector)?.contains(document.activeElement);

	const layout = readAtlasLayout();

	setFlag(false);

	// In the split, clearing the flag has already turned the pane back into the regular page
	if (layout !== 'map') {
		if (hasShellFocus) {
			document.querySelector<HTMLElement>(atlasPaneSelector)?.focus({ preventScroll: true });
		}

		return;
	}

	runExitAction(
		getAtlasExitAction({
			canGoBack: 'navigation' in globalThis && navigation.canGoBack,
			homePath: getSitePath(),
			returnPath: getReturnPath(),
		}),
	);
}

function getFromPage(screen: AtlasScreen) {
	const isLowered = screen.layout === 'sheet' && screen.rest === atlasSheetRest.down;

	return isLowered ? atlasPage.map : document.documentElement.dataset.atlasPage;
}

async function clearFromWhenFinished(transition: ViewTransition) {
	await transition.finished;

	delete document.documentElement.dataset.atlasFrom;
}

// Called once by the setup script on every page; bundled scripts do not run again after a swap
export function startAtlasMode() {
	document.addEventListener(mapIntentEventName, (event) => {
		const action = getAtlasOpenAction({
			intent: event.detail,
			pathname: location.pathname,
			screen: readAtlasScreen(),
		});

		// Left uncancelled, the map spends the click on its own popup
		if (action.type !== 'none') event.preventDefault();

		runOpenAction(action);
	});

	matchMedia(atlasPaneMediaQuery).addEventListener('change', () => {
		resetSheet();
		updateSplit();
		dispatchSync();
	});

	matchMedia(atlasSheetHalfMediaQuery).addEventListener('change', () => {
		if (readSheetRest() === atlasSheetRest.half) resetSheet();

		dispatchSync();
	});

	document.addEventListener(mapEnterEventName, openAtlas);
	document.addEventListener(mapExitEventName, () => {
		void closeAtlas();
	});
	document.addEventListener(mapExpandEventName, () => {
		void navigate(getSitePath('atlas'));
	});

	// The swap copies the incoming root's attributes and inline style verbatim, so mode state is stamped here
	document.addEventListener('astro:before-swap', (event) => {
		const root = document.documentElement;
		const incomingRoot = event.newDocument.documentElement;
		const isMap = incomingRoot.dataset.atlasPage === atlasPage.map;
		const paneSize = root.style.getPropertyValue(atlasPaneSizeProperty);

		if (isMap) storeFlag(true);

		incomingRoot.toggleAttribute('data-atlas', isMap || 'atlas' in root.dataset);

		if (paneSize) incomingRoot.style.setProperty(atlasPaneSizeProperty, paneSize);

		const from = getFromPage(readAtlasScreen());

		if (from) incomingRoot.dataset.atlasFrom = from;

		prepareSheetArrival(event);

		updateHeroSizes(event.newDocument);

		void clearFromWhenFinished(event.viewTransition);

		// Only atlas pages render the shell; a live one needs a target in the incoming page or the swap drops it
		if (!document.querySelector(shellSelector)) return;
		if (event.newDocument.querySelector(shellSelector)) return;

		const target = event.newDocument.createElement('div');

		target.dataset.astroTransitionPersist = atlasPersistName;
		event.newDocument.body.append(target);
	});

	document.addEventListener('astro:page-load', startColdSheetArrival, { once: true });

	document.addEventListener('astro:page-load', () => {
		if (readAtlasLayout() !== 'map') {
			try {
				sessionStorage.setItem(atlasReturnStorageKey, location.pathname + location.search);
			} catch {
				// sessionStorage unavailable
			}
		}

		updateExternalLinks();
		dispatchSync();
	});
}
