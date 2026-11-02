import type { Locator, Page } from '@playwright/test';

import {
	defaultMapMessages,
	getHostControlClassName,
	mapActiveAttribute,
	mapControlClassName,
} from '@spectralcodex/react-map-component/constants';

import type { ConsoleGuard } from '#e2e/test.ts';

import { mapLoadTimeout } from '#e2e/map.ts';
import { expect } from '#e2e/test.ts';
import {
	atlasInlineMapSelector,
	atlasPage,
	atlasPageAttribute,
	atlasPaneSelector,
	atlasSheetAttribute,
	atlasSheetHandleSelector,
	atlasSheetRest,
	atlasShellSelector,
} from '#lib/atlas/atlas-constants.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

export const atlasPath = '/atlas/';
export const phoneViewport = { height: 844, width: 390 };
export const wideViewport = { height: 900, width: 1440 };

// Gecko and WebKit log a reload's cancelled loads, so only Chromium guards the console here
export function allowReloadNoise(consoleGuard: ConsoleGuard, browserName: string) {
	if (browserName !== 'chromium') consoleGuard.allow(/./);
}

export function getAtlas(page: Page) {
	const shell = page.locator(atlasShellSelector);

	return {
		canvas: shell.locator('canvas.maplibregl-canvas'),
		close: shell.getByRole('button', { name: t('atlas.close.label') }),
		handle: page.locator(`${atlasSheetHandleSelector} button`),
		marker: shell.locator('.maplibregl-marker').first(),
		metrics: shell.locator(`.${mapControlClassName.metrics}`),
		popup: shell.locator('.maplibregl-popup'),
		root: page.locator('html'),
		scopeBar: shell.locator(`.${mapControlClassName.scopeBar}`),
		scopeName: shell.locator(`.${mapControlClassName.scopeName}`),
		scopeToggle: shell.locator(`.${mapControlClassName.scopeToggle}`),
		searchInput: shell.getByRole('combobox', { name: defaultMapMessages.searchLabel }),
		searchOpener: shell.getByRole('button', { name: defaultMapMessages.searchLabel }),
		searchOptions: shell.getByRole('option'),
		shell,
		title: page.locator('h1'),
	};
}

// The inline map hydrates only when it scrolls into view, so its controls don't exist until then
export async function enterAtlas(page: Page) {
	const inlineMap = page.locator(atlasInlineMapSelector);

	await inlineMap.scrollIntoViewIfNeeded();
	await inlineMap.locator(`.${getHostControlClassName('enter')}`).click();
	await expect(getAtlas(page).canvas).toBeVisible({ timeout: mapLoadTimeout });
}

export async function getHeading(page: Page) {
	return ((await page.locator('h1').textContent()) ?? '').trim();
}

export async function openInPane(page: Page, link: Locator) {
	const href = (await link.getAttribute('href')) ?? '';

	await link.click();
	await page.waitForURL(`**${href}`);
	await expect(page.locator('html')).toHaveAttribute(atlasPageAttribute, atlasPage.pane);

	return getHeading(page);
}

export function getPreviewLink(page: Page) {
	return page.locator(`${atlasPaneSelector} main .card-preview a[href]`).first();
}

// A rebuilt map brings a fresh canvas that lacks this flag
export async function keepCanvas(canvas: Locator) {
	await canvas.evaluate((element) => {
		Object.assign(element, { isKept: true });
	});
}

export async function expectSameCanvas(canvas: Locator) {
	await expect(canvas).toBeVisible();
	expect(await canvas.evaluate((element) => 'isKept' in element)).toBe(true);
}

// MapLibre forces its open attribution visible, so it shows through a shell hidden with `visibility`
export async function expectShellGone(shell: Locator) {
	await expect(shell).toBeHidden();
	await expect(shell.locator('*').filter({ visible: true })).toHaveCount(0);
}

export async function lowerSheet(page: Page) {
	const { handle, root } = getAtlas(page);

	await expect(root).toHaveAttribute(atlasSheetAttribute);

	if ((await root.getAttribute(atlasSheetAttribute)) !== atlasSheetRest.lowered)
		await handle.click();

	await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.lowered);
}

export async function holdSlide(page: Page) {
	await page.locator(atlasPaneSelector).evaluate((pane) => {
		async function markSlideOver() {
			await Promise.allSettled(pane.getAnimations().map((slide) => slide.finished));
			Object.assign(globalThis, { isSlideOver: true });
		}

		void markSlideOver();
	});
}

export async function waitForSlide(page: Page) {
	await page.waitForFunction(() => 'isSlideOver' in globalThis);
}

export async function expectScopeHeld(page: Page, title: string) {
	const { metrics, scopeBar, scopeName } = getAtlas(page);

	await expect(scopeName).toHaveText(title, { timeout: mapLoadTimeout });
	await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
	await expect(metrics).toBeVisible();

	return (await metrics.textContent()) ?? '';
}

export async function toggleScope(page: Page, scopedMetrics: string) {
	const { metrics, scopeBar, scopeToggle } = getAtlas(page);

	await scopeToggle.click();
	await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);
	await expect(metrics).not.toHaveText(scopedMetrics);

	await scopeToggle.click();
	await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
	await expect(metrics).toHaveText(scopedMetrics);
}

// History moves the address before the page is fetched and swapped, so the heading marks the arrival
export async function expectHistoryArrival(page: Page, heading: string) {
	await expect(page.locator('h1')).toHaveText(heading);
}

export function getSlugQuery(path: string) {
	return path.replaceAll('/', '').replaceAll('-', ' ');
}

// Enter does nothing until the results arrive, so wait for the first one as a reader would
export async function searchFor(page: Page, query: string) {
	const { searchInput, searchOpener, searchOptions } = getAtlas(page);

	await searchOpener.click();
	await expect(searchInput).toBeFocused();
	await searchInput.fill(query);
	await expect(searchOptions.first()).toBeVisible();
}
