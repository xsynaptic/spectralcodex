import {
	atlasMapMinProperty,
	atlasPaneDefaultProperty,
	atlasPaneMinProperty,
	atlasPaneSelector,
	atlasPaneSizeProperty,
	atlasPaneStorageKey,
} from '#lib/atlas/atlas-constants.ts';
import { clampPaneWidth } from '#lib/atlas/atlas-pane-factory.ts';

const heroSelector = 'img[data-hero-image]';

function readPaneTokenRems(style: CSSStyleDeclaration) {
	function readRem(name: string) {
		return Number(style.getPropertyValue(name).replace('rem', ''));
	}

	return {
		mapMin: readRem(atlasMapMinProperty),
		paneDefault: readRem(atlasPaneDefaultProperty),
		paneMin: readRem(atlasPaneMinProperty),
	};
}

let paneTokenRems: ReturnType<typeof readPaneTokenRems> | undefined;

function readPaneTokens() {
	const style = getComputedStyle(document.documentElement);
	const rootFontSize = Number(style.fontSize.replace('px', ''));

	if (!paneTokenRems) paneTokenRems = readPaneTokenRems(style);

	return {
		mapMin: paneTokenRems.mapMin * rootFontSize,
		paneDefault: paneTokenRems.paneDefault * rootFontSize,
		paneMin: paneTokenRems.paneMin * rootFontSize,
		rootFontSize,
	};
}

export function getPaneWidth() {
	return document.querySelector(atlasPaneSelector)?.getBoundingClientRect().width ?? 0;
}

export function getPaneLimits() {
	return { ...readPaneTokens(), viewportWidth: document.documentElement.clientWidth };
}

function getSplitHeroSizes(root: HTMLElement) {
	const limits = getPaneLimits();
	const paneSize = Number(root.style.getPropertyValue(atlasPaneSizeProperty).replace('px', ''));

	return `${String(Math.round(clampPaneWidth(paneSize || limits.paneDefault, limits)))}px`;
}

export function updateHeroSizes(isSplit: boolean, target: Document = document) {
	const sizes = isSplit ? getSplitHeroSizes(target.documentElement) : undefined;

	for (const heroImage of target.querySelectorAll<HTMLImageElement>(heroSelector)) {
		if (heroImage.dataset.sizes === undefined) heroImage.dataset.sizes = heroImage.sizes;

		heroImage.sizes = sizes ?? heroImage.dataset.sizes;
	}
}

export function stampPaneSize(incomingRoot: HTMLElement) {
	const paneSize = document.documentElement.style.getPropertyValue(atlasPaneSizeProperty);

	if (paneSize) incomingRoot.style.setProperty(atlasPaneSizeProperty, paneSize);
}

export function requestPaneWidth(width: number) {
	document.documentElement.style.setProperty(atlasPaneSizeProperty, `${String(width)}px`);

	try {
		localStorage.setItem(atlasPaneStorageKey, String(Math.round(width)));
	} catch {
		// localStorage unavailable
	}

	updateHeroSizes(true);
}
