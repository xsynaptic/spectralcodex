import {
	mapEnterEventName,
	mapExitEventName,
	mapExpandEventName,
	mapFeatureOpenEventName,
} from '@spectralcodex/react-map-component/constants';
import { navigate } from 'astro:transitions/client';

import {
	atlasFlagStorageKey,
	atlasPage,
	atlasPaneMediaQuery,
	atlasPaneSelector,
	atlasPaneSizeProperty,
	atlasPaneStorageKey,
	atlasPersistName,
	atlasReturnStorageKey,
} from '#lib/atlas/atlas-constants.ts';
import { getAtlasExitAction } from '#lib/atlas/atlas-exit-factory.ts';
import { getAtlasLayout } from '#lib/atlas/atlas-layout-factory.ts';
import { getPaneImageSizes } from '#lib/atlas/atlas-pane-factory.ts';
import { getPaneTokens } from '#lib/atlas/atlas-pane.ts';
import { isSheetDown, moveSheet, setSheetDown } from '#lib/atlas/atlas-sheet.ts';
import { dispatchSync } from '#lib/atlas/atlas-sync.ts';
import { getSitePath } from '#lib/utils/routing.ts';

const heroSelector = 'img[data-hero-image]';
const paneAnchorSelector = `${atlasPaneSelector} a[href]`;
const paneMainSelector = `${atlasPaneSelector} > main`;
const shellSelector = `[data-astro-transition-persist="${atlasPersistName}"]`;

function getLayout(root: HTMLElement) {
	return getAtlasLayout({
		hasFlag: 'atlas' in root.dataset,
		isPaneMatch: matchMedia(atlasPaneMediaQuery).matches,
		page: root.dataset.atlasPage,
	});
}

function getSplitHeroSizes(root: HTMLElement) {
	if (getLayout(root) !== 'split') return;

	const { mapMinRem, paneDefaultRem, paneMinRem } = getPaneTokens();
	const paneSize =
		root.style.getPropertyValue(atlasPaneSizeProperty) || `${String(paneDefaultRem)}rem`;

	return getPaneImageSizes({ mapMinRem, mediaQuery: atlasPaneMediaQuery, paneMinRem, paneSize });
}

function updateHeroSizes(target: Document = document) {
	const sizes = getSplitHeroSizes(target.documentElement);

	for (const heroImage of target.querySelectorAll<HTMLImageElement>(heroSelector)) {
		if (heroImage.dataset.sizes === undefined) heroImage.dataset.sizes = heroImage.sizes;

		heroImage.sizes = sizes ?? heroImage.dataset.sizes;
	}
}

// Following an outbound link in the same tab unloads the map; internal links swap into the pane
function updateExternalLinks() {
	const isSplit = getLayout(document.documentElement) === 'split';

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

	return document.querySelector(paneMainSelector)?.getBoundingClientRect().top ?? 0;
}

function setFlag(isEnabled: boolean) {
	const mainTop = getSheetMainTop();

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

function openAtlas() {
	if (document.fullscreenElement) void document.exitFullscreen();

	setFlag(true);

	document.querySelector<HTMLElement>(shellSelector)?.focus({ preventScroll: true });

	if (!matchMedia(atlasPaneMediaQuery).matches) {
		void moveSheet(true);
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

async function closeAtlas() {
	if (isSheetDown()) await moveSheet(false);

	const hasShellFocus = document.querySelector(shellSelector)?.contains(document.activeElement);

	setFlag(false);

	// In the split, clearing the flag has already turned the pane back into the regular page
	if (document.documentElement.dataset.atlasPage !== atlasPage.map) {
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

async function clearFromWhenFinished(transition: ViewTransition) {
	await transition.finished;

	delete document.documentElement.dataset.atlasFrom;
}

export function requestPaneWidth(width: number) {
	document.documentElement.style.setProperty(atlasPaneSizeProperty, `${String(width)}px`);

	try {
		localStorage.setItem(atlasPaneStorageKey, String(Math.round(width)));
	} catch {
		// localStorage unavailable
	}

	updateHeroSizes();
}

// Called once by the setup script on every page; bundled scripts do not run again after a swap
export function startAtlasMode() {
	document.addEventListener(mapFeatureOpenEventName, (event) => {
		const { url } = event.detail;

		if (url === location.pathname) {
			if (!event.cancelable || !isSheetDown()) return;

			event.preventDefault();
			void moveSheet(false);
			return;
		}

		void navigate(url);
	});

	matchMedia(atlasPaneMediaQuery).addEventListener('change', () => {
		setSheetDown(false);
		updateSplit();
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

		const from = isSheetDown() ? atlasPage.map : root.dataset.atlasPage;

		if (from) incomingRoot.dataset.atlasFrom = from;

		updateHeroSizes(event.newDocument);

		void clearFromWhenFinished(event.viewTransition);

		// Only atlas pages render the shell; a live one needs a target in the incoming page or the swap drops it
		if (!document.querySelector(shellSelector)) return;
		if (event.newDocument.querySelector(shellSelector)) return;

		const target = event.newDocument.createElement('div');

		target.dataset.astroTransitionPersist = atlasPersistName;
		event.newDocument.body.append(target);
	});

	document.addEventListener('astro:page-load', () => {
		if (document.documentElement.dataset.atlasPage !== atlasPage.map) {
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
