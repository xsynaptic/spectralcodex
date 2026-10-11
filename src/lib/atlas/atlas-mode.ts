import {
	mapExitEventName,
	mapFeatureOpenEventName,
	mapSyncEventName,
} from '@spectralcodex/react-map-component/constants';
import { navigate } from 'astro:transitions/client';

import {
	atlasFlagStorageKey,
	atlasPage,
	atlasPaneMediaQuery,
	atlasPaneSizeProperty,
	atlasPaneStorageKey,
	atlasPersistName,
} from '#lib/atlas/atlas-constants.ts';
import { getAtlasExitAction } from '#lib/atlas/atlas-exit-factory.ts';
import { getAtlasLayout } from '#lib/atlas/atlas-layout-factory.ts';
import { getPaneImageSizes } from '#lib/atlas/atlas-pane-factory.ts';
import { getPaneTokens } from '#lib/atlas/atlas-pane.ts';
import { getSitePath } from '#lib/utils/routing.ts';

const returnStorageKey = 'scx-atlas-return';

const heroSelector = 'img[data-hero-image]';
const paneAnchorSelector = '.main-pane a[href]';
const shellSelector = `[data-astro-transition-persist="${atlasPersistName}"]`;

function dispatchSync() {
	document.dispatchEvent(new Event(mapSyncEventName));
}

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

function setFlag(isEnabled: boolean) {
	document.documentElement.toggleAttribute('data-atlas', isEnabled);

	storeFlag(isEnabled);
	updateSplit();
	dispatchSync();
}

function getReturnPath() {
	try {
		return sessionStorage.getItem(returnStorageKey) ?? undefined;
	} catch {
		// sessionStorage unavailable
		return;
	}
}

function openAtlas() {
	setFlag(true);
}

export function closeAtlas() {
	setFlag(false);

	// In the split, clearing the flag has already turned the pane back into the regular page
	if (document.documentElement.dataset.atlasPage !== atlasPage.map) return;

	const action = getAtlasExitAction({
		canGoBack: 'navigation' in globalThis && navigation.canGoBack,
		homePath: getSitePath(),
		returnPath: getReturnPath(),
	});

	if (action.type === 'back') {
		history.back();
		return;
	}

	void navigate(action.path, { history: 'replace' });
}

// atlas.css clamps the request into `--atlas-pane-width`; the pane's rendered width is the settled value
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
	// The island's channel only; app code calls `closeAtlas()`
	document.addEventListener(mapExitEventName, closeAtlas);

	document.addEventListener(mapFeatureOpenEventName, (event) => {
		const { url } = event.detail;

		// Another Point of the Location already in the pane
		if (url === location.pathname) return;

		void navigate(url);
	});

	matchMedia(atlasPaneMediaQuery).addEventListener('change', updateSplit);

	document.addEventListener('click', (event) => {
		if (!(event.target instanceof Element) || !event.target.closest('[data-atlas-open]')) return;

		openAtlas();
	});

	// The swap copies the incoming root's attributes and inline style verbatim, so mode state is stamped here
	document.addEventListener('astro:before-swap', (event) => {
		const root = document.documentElement;
		const incomingRoot = event.newDocument.documentElement;
		const isMap = incomingRoot.dataset.atlasPage === atlasPage.map;
		const paneSize = root.style.getPropertyValue(atlasPaneSizeProperty);

		// Visiting the full-screen map turns the mode on
		if (isMap) storeFlag(true);

		incomingRoot.toggleAttribute('data-atlas', isMap || 'atlas' in root.dataset);

		if (paneSize) incomingRoot.style.setProperty(atlasPaneSizeProperty, paneSize);

		// The stylesheet reads where a navigation came from once the root is the incoming page's
		if (root.dataset.atlasPage) incomingRoot.dataset.atlasFrom = root.dataset.atlasPage;

		updateHeroSizes(event.newDocument);

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
				sessionStorage.setItem(returnStorageKey, location.pathname + location.search);
			} catch {
				// sessionStorage unavailable
			}
		}

		updateExternalLinks();
		dispatchSync();
	});
}
