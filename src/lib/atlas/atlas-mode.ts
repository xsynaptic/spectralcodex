import type { MapFeatureOpenDetail } from '@spectralcodex/react-map-component';

import { navigate } from 'astro:transitions/client';

import {
	atlasExitEventName,
	atlasFlagStorageKey,
	atlasHeroSelector,
	atlasHeroSizesTemplate,
	atlasNavigateEventName,
	atlasPaneMediaQuery,
	atlasPaneSizeDefault,
	atlasPaneSizeProperty,
	atlasPaneStorageKey,
	atlasPersistName,
	atlasSyncEventName,
} from '#lib/atlas/atlas-constants.ts';
import { getAtlasExitAction } from '#lib/atlas/atlas-exit-factory.ts';
import { getSitePath } from '#lib/utils/routing.ts';

const returnStorageKey = 'scx-atlas-return';

const shellSelector = `[data-astro-transition-persist="${atlasPersistName}"]`;

function dispatchSync() {
	document.dispatchEvent(new Event(atlasSyncEventName));
}

function updateHeroSizes() {
	const root = document.documentElement;
	const isSplit = 'atlas' in root.dataset && root.dataset.atlasPage === 'location';
	const paneSize = root.style.getPropertyValue(atlasPaneSizeProperty) || atlasPaneSizeDefault;

	for (const heroImage of document.querySelectorAll<HTMLImageElement>(atlasHeroSelector)) {
		if (heroImage.dataset.sizes === undefined) heroImage.dataset.sizes = heroImage.sizes;

		heroImage.sizes = isSplit
			? atlasHeroSizesTemplate.replace('[size]', () => paneSize)
			: heroImage.dataset.sizes;
	}
}

function setFlag(isEnabled: boolean) {
	document.documentElement.toggleAttribute('data-atlas', isEnabled);

	try {
		if (isEnabled) sessionStorage.setItem(atlasFlagStorageKey, '1');
		else sessionStorage.removeItem(atlasFlagStorageKey);
	} catch {
		// sessionStorage unavailable
	}

	updateHeroSizes();
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

// False below the pane breakpoint, where there is no split and the caller's link to the full-screen map navigates
export function openAtlas() {
	if (!matchMedia(atlasPaneMediaQuery).matches) return false;

	setFlag(true);

	return true;
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
	document.addEventListener(atlasExitEventName, () => {
		setFlag(false);

		// In the split the sync event has already turned the Location back into the regular page
		if (document.documentElement.dataset.atlasPage !== 'map') return;

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
	});

	document.addEventListener(atlasNavigateEventName, (event) => {
		if (!(event instanceof CustomEvent)) return;

		const { url } = event.detail as MapFeatureOpenDetail;

		// Another Point of the Location already in the pane
		if (url === location.pathname) return;

		void navigate(url);
	});

	// Only atlas pages render the shell; a live one needs a target in the incoming page or the swap drops it
	document.addEventListener('astro:before-swap', (event) => {
		if (!document.querySelector(shellSelector)) return;
		if (event.newDocument.querySelector(shellSelector)) return;

		const target = event.newDocument.createElement('div');

		target.dataset.astroTransitionPersist = atlasPersistName;
		event.newDocument.body.append(target);
	});

	document.addEventListener('astro:page-load', () => {
		if (document.documentElement.dataset.atlasPage !== 'map') {
			try {
				sessionStorage.setItem(returnStorageKey, location.pathname + location.search);
			} catch {
				// sessionStorage unavailable
			}
		}

		dispatchSync();
	});
}
