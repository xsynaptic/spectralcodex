import type { AtlasPaneLimits } from '#lib/atlas/atlas-pane-factory.ts';

import {
	atlasPaneMediaQuery,
	atlasPaneSelector,
	atlasPaneSizeProperty,
	atlasPaneStorageKey,
} from '#lib/atlas/atlas-constants.ts';
import { readAtlasLayout } from '#lib/atlas/atlas-layout.ts';
import { getPaneImageSizes } from '#lib/atlas/atlas-pane-factory.ts';

const heroSelector = 'img[data-hero-image]';

function readPaneTokens() {
	const style = getComputedStyle(document.documentElement);

	function readRem(name: string) {
		return Number(style.getPropertyValue(name).replace('rem', ''));
	}

	return {
		mapMinRem: readRem('--atlas-map-min'),
		paneDefaultRem: readRem('--atlas-pane-default'),
		paneMinRem: readRem('--atlas-pane-min'),
	};
}

let paneTokens: ReturnType<typeof readPaneTokens> | undefined;

// Declared in parts/theme.css, in rem; constants of the stylesheet, so one read serves the session
function getPaneTokens() {
	if (paneTokens) return paneTokens;

	paneTokens = readPaneTokens();

	return paneTokens;
}

export function getPaneWidth() {
	return document.querySelector(atlasPaneSelector)?.getBoundingClientRect().width ?? 0;
}

export function getPaneLimits(): AtlasPaneLimits {
	const root = document.documentElement;
	const rootFontSize = Number(getComputedStyle(root).fontSize.replace('px', ''));
	const { mapMinRem, paneMinRem } = getPaneTokens();

	return {
		mapMin: mapMinRem * rootFontSize,
		paneMin: paneMinRem * rootFontSize,
		rootFontSize,
		// Excludes the scrollbar, as the pane's right edge does
		viewportWidth: root.clientWidth,
	};
}

function getSplitHeroSizes(root: HTMLElement) {
	if (readAtlasLayout(root) !== 'split') return;

	const { mapMinRem, paneDefaultRem, paneMinRem } = getPaneTokens();
	const paneSize =
		root.style.getPropertyValue(atlasPaneSizeProperty) || `${String(paneDefaultRem)}rem`;

	return getPaneImageSizes({ mapMinRem, mediaQuery: atlasPaneMediaQuery, paneMinRem, paneSize });
}

export function updateHeroSizes(target: Document = document) {
	const sizes = getSplitHeroSizes(target.documentElement);

	for (const heroImage of target.querySelectorAll<HTMLImageElement>(heroSelector)) {
		if (heroImage.dataset.sizes === undefined) heroImage.dataset.sizes = heroImage.sizes;

		heroImage.sizes = sizes ?? heroImage.dataset.sizes;
	}
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
