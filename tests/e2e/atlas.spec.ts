import type { Locator, Page } from '@playwright/test';

import {
	defaultMapMessages,
	getHostControlClassName,
	mapActiveAttribute,
	mapControlClassName,
	mapInsetProperty,
} from '@spectralcodex/react-map-component/constants';

import type { ConsoleGuard } from '#e2e/test.ts';

import { isDev, paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import {
	atlasFlagAttribute,
	atlasInlineMapSelector,
	atlasPage,
	atlasPageAttribute,
	atlasPaneMainSelector,
	atlasPaneSelector,
	atlasReturnStorageKey,
	atlasSheetAttribute,
	atlasSheetHandleSelector,
	atlasSheetRest,
	atlasSheetRestStorageKey,
	atlasSheetStartSelector,
	atlasShellSelector,
} from '#lib/atlas/atlas-constants.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const atlasPath = '/atlas/';
const phoneViewport = { height: 844, width: 390 };
const phoneSidewaysViewport = { height: 390, width: 844 };
const wideViewport = { height: 900, width: 1440 };

const mapLoadTimeout = isDev ? 20_000 : 10_000;

function getAtlas(page: Page) {
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
async function enterAtlas(page: Page) {
	const inlineMap = page.locator(atlasInlineMapSelector);

	await inlineMap.scrollIntoViewIfNeeded();
	await inlineMap.locator(`.${getHostControlClassName('enter')}`).click();
	await expect(getAtlas(page).canvas).toBeVisible({ timeout: mapLoadTimeout });
}

async function openInPane(page: Page, link: Locator) {
	const href = (await link.getAttribute('href')) ?? '';

	await link.click();
	await page.waitForURL(`**${href}`);
	await expect(page.locator('html')).toHaveAttribute(atlasPageAttribute, atlasPage.pane);

	return getHeading(page);
}

// The map band counts as in viewport, so landing under the handle takes two live boxes
async function expectUnderHandle(page: Page, locator: Locator) {
	await expect(async () => {
		const handleBox = await page.locator(atlasSheetHandleSelector).boundingBox();
		const box = await locator.boundingBox();
		const handleBottom = (handleBox?.y ?? 0) + (handleBox?.height ?? 0);

		expect(Math.abs((box?.y ?? 0) - handleBottom)).toBeLessThanOrEqual(1);
	}).toPass();
}

function getPreviewLink(page: Page) {
	return page.locator(`${atlasPaneSelector} main .card-preview a[href]`).first();
}

// A rebuilt map would get a new canvas without this flag
async function keepCanvas(canvas: Locator) {
	await canvas.evaluate((element) => {
		Object.assign(element, { isKept: true });
	});
}

async function expectSameCanvas(canvas: Locator) {
	await expect(canvas).toBeVisible();
	expect(await canvas.evaluate((element) => 'isKept' in element)).toBe(true);
}

// MapLibre forces its open attribution visible, so it shows through a shell hidden with `visibility`
async function expectShellGone(shell: Locator) {
	await expect(shell).toBeHidden();
	await expect(shell.locator('*').filter({ visible: true })).toHaveCount(0);
}

async function lowerSheet(page: Page) {
	const { handle, root } = getAtlas(page);

	await expect(root).toHaveAttribute(atlasSheetAttribute);

	if ((await root.getAttribute(atlasSheetAttribute)) !== atlasSheetRest.lowered)
		await handle.click();

	await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.lowered);
}

// Gecko and WebKit log a reload's cancelled loads, so only Chromium guards the console here
function allowReloadNoise(consoleGuard: ConsoleGuard, browserName: string) {
	if (browserName !== 'chromium') consoleGuard.allow(/./);
}

async function expectScopeHeld(page: Page, title: string) {
	const { metrics, scopeBar, scopeName } = getAtlas(page);

	await expect(scopeName).toHaveText(title, { timeout: mapLoadTimeout });
	await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
	await expect(metrics).toBeVisible();

	return (await metrics.textContent()) ?? '';
}

async function toggleScope(page: Page, scopedMetrics: string) {
	const { metrics, scopeBar, scopeToggle } = getAtlas(page);

	await scopeToggle.click();
	await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);
	await expect(metrics).not.toHaveText(scopedMetrics);

	await scopeToggle.click();
	await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
	await expect(metrics).toHaveText(scopedMetrics);
}

async function getHeading(page: Page) {
	return ((await page.locator('h1').textContent()) ?? '').trim();
}

// History moves the address before the page is fetched and swapped, so the heading marks the arrival
async function expectHistoryArrival(page: Page, heading: string) {
	await expect(page.locator('h1')).toHaveText(heading);
}

function getSlugQuery(path: string) {
	return path.replaceAll('/', '').replaceAll('-', ' ');
}

// Enter does nothing until the results arrive, so wait for the first one as a reader would
async function searchFor(page: Page, query: string) {
	const { searchInput, searchOpener, searchOptions } = getAtlas(page);

	await searchOpener.click();
	await expect(searchInput).toBeFocused();
	await searchInput.fill(query);
	await expect(searchOptions.first()).toBeVisible();
}

test('the atlas loads from a direct visit', { tag: '@smoke' }, async ({ page }) => {
	await visit(page, atlasPath);

	await expect(getAtlas(page).metrics).toBeVisible({ timeout: mapLoadTimeout });
});

test.describe('on a wide viewport', () => {
	test.use({ viewport: wideViewport });

	test(
		'one map carries a reader through the split, the full-screen atlas and back out',
		{ tag: '@smoke' },
		async ({ page }) => {
			const { canvas, close, root, shell } = getAtlas(page);
			const atlasStylesheet = shell.locator('link[rel="stylesheet"]');

			await visit(page, paths.regionDetail);
			await expect(atlasStylesheet).toHaveCount(0);

			await enterAtlas(page);
			await expect(atlasStylesheet).toHaveCount(1);
			await expect(shell).toBeFocused();
			await keepCanvas(canvas);

			const paneTitle = await openInPane(page, getPreviewLink(page));

			await expectSameCanvas(canvas);

			await shell.getByRole('button', { name: t('atlas.expand.label') }).click();
			await page.waitForURL(`**${atlasPath}`);
			await expectSameCanvas(canvas);

			await close.click();
			await expectHistoryArrival(page, paneTitle);

			await expect(root).not.toHaveAttribute(atlasFlagAttribute);
			await expectShellGone(shell);
		},
	);

	test('the split survives a reload at the width the reader set', async ({ page }) => {
		const separator = page.getByRole('separator', { name: t('atlas.divider.label') });

		await visit(page, paths.regionDetail);
		await enterAtlas(page);

		const openedWidth = (await separator.getAttribute('aria-valuenow')) ?? '';

		await separator.press('ArrowLeft');
		await separator.press('ArrowLeft');
		await expect(separator).not.toHaveAttribute('aria-valuenow', openedWidth);

		const chosenWidth = (await separator.getAttribute('aria-valuenow')) ?? '';

		await page.reload({ waitUntil: 'domcontentloaded' });

		await expect(page.locator('html')).toHaveAttribute(atlasFlagAttribute);
		await expect(separator).toHaveAttribute('aria-valuenow', chosenWidth);
	});

	test("another of the open Location's Points opens its own popup, with no link to the page it is on", async ({
		page,
	}) => {
		const { shell } = getAtlas(page);
		const markers = shell.locator('.maplibregl-marker');
		const popupTitle = shell.locator(`.maplibregl-popup .${mapControlClassName.popupTitle}`);

		await visit(page, paths.locationMultiPoint);
		await enterAtlas(page);
		await expect(markers.nth(1)).toBeVisible();

		await markers.nth(1).click();

		await expect(popupTitle).toBeVisible();
		await expect(popupTitle.locator('a')).toHaveCount(0);
		expect(new URL(page.url()).pathname).toBe(paths.locationMultiPoint);
	});

	test('one overlay at a time: search closes a popup, and a press on the empty map closes the filter menu', async ({
		page,
	}) => {
		const { canvas, popup, searchInput, searchOpener, shell } = getAtlas(page);
		const markers = shell.locator('.maplibregl-marker');
		const filterButton = page.getByRole('button', {
			name: defaultMapMessages.filterMenuAriaLabel,
		});

		await visit(page, paths.locationMultiPoint);
		await enterAtlas(page);
		await markers.nth(1).click();
		await expect(popup).toBeVisible();

		await searchOpener.click();

		await expect(searchInput).toBeFocused();
		await expect(popup).toHaveCount(0);

		await filterButton.click();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'true');

		await canvas.click();

		await expect(filterButton).toHaveAttribute('aria-expanded', 'false');
		await expect(popup).toHaveCount(0);
		expect(new URL(page.url()).pathname).toBe(paths.locationMultiPoint);
	});

	test('a filter the reader set holds as the pane moves to another page', async ({ page }) => {
		const { metrics, shell } = getAtlas(page);
		const filterButton = shell.locator(`.${mapControlClassName.filter}`);
		const topRating = shell.locator(`.${mapControlClassName.filterRating} button`).last();

		await visit(page, paths.regionDetail);

		const regionTitle = await getHeading(page);

		await enterAtlas(page);
		await expect(metrics).toBeVisible();

		const unfilteredMetrics = (await metrics.textContent()) ?? '';

		await filterButton.click();
		await topRating.click();
		await expect(topRating).toHaveAttribute('aria-pressed', 'true');
		await expect(metrics).not.toHaveText(unfilteredMetrics);

		const filteredMetrics = (await metrics.textContent()) ?? '';

		await page.keyboard.press('Escape');
		await openInPane(page, getPreviewLink(page));
		await page.goBack();
		await expectHistoryArrival(page, regionTitle);

		await expect(metrics).toHaveText(filteredMetrics);
		await filterButton.click();
		await expect(topRating).toHaveAttribute('aria-pressed', 'true');
	});
});

test.describe('a Scope on a wide viewport', () => {
	test.use({ viewport: wideViewport });

	test('a Post scopes the map, and a Location it links to keeps the Scope', async ({ page }) => {
		await visit(page, paths.postDetail);

		const title = await getHeading(page);

		await enterAtlas(page);

		const scopedMetrics = await expectScopeHeld(page, title);

		await openInPane(page, page.locator(`main a[href="${paths.postLocation}"]`).first());

		await expect(getAtlas(page).marker).toBeVisible();
		await expect(getAtlas(page).metrics).toHaveText(scopedMetrics);
		await expectScopeHeld(page, title);
		await toggleScope(page, scopedMetrics);
	});

	test('a Theme Scope turned off comes back from its name and from a later visit', async ({
		page,
	}) => {
		const { metrics, scopeBar, scopeName, scopeToggle } = getAtlas(page);

		await visit(page, paths.themeDetail);

		const title = await getHeading(page);

		await enterAtlas(page);

		const scopedMetrics = await expectScopeHeld(page, title);

		const paneTitle = await openInPane(page, getPreviewLink(page));

		await expectScopeHeld(page, title);

		await scopeToggle.click();
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await scopeName.click();
		await page.waitForURL(`**${paths.themeDetail}`);
		await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
		await expect(metrics).toHaveText(scopedMetrics);

		await scopeToggle.click();
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await page.goBack();
		await expectHistoryArrival(page, paneTitle);
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await page.goForward();
		await expectHistoryArrival(page, title);
		await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
	});

	test('a Series scopes the map, and a Location in it keeps the Scope', async ({ page }) => {
		await visit(page, paths.seriesDetail);

		const title = await getHeading(page);

		await enterAtlas(page);

		const scopedMetrics = await expectScopeHeld(page, title);

		await openInPane(page, getPreviewLink(page));

		await expect(getAtlas(page).marker).toBeVisible();
		await expect(getAtlas(page).metrics).toHaveText(scopedMetrics);
		await expectScopeHeld(page, title);
		await toggleScope(page, scopedMetrics);
	});
});

test.describe('search on a wide viewport', () => {
	test.use({ viewport: wideViewport });

	test('a Location found by name opens in the pane, and focus returns to the prompt', async ({
		page,
	}) => {
		const { searchInput, searchOpener } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, getSlugQuery(paths.postLocation));
		await searchInput.press('Enter');

		await page.waitForURL(`**${paths.postLocation}`);
		await expect(searchInput).toBeHidden();
		await expect(searchOpener).toBeFocused();
	});

	test('the arrow keys and the pointer move through the rows, and Escape closes onto the opener', async ({
		page,
	}) => {
		const { searchInput, searchOpener, searchOptions } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, 'temple');
		await expect(searchOptions.first()).toHaveAttribute('aria-selected', 'true');

		await searchInput.press('ArrowDown');
		await expect(searchOptions.nth(1)).toHaveAttribute('aria-selected', 'true');
		await expect(searchInput).toHaveAttribute(
			'aria-activedescendant',
			(await searchOptions.nth(1).getAttribute('id')) ?? '',
		);

		await searchInput.press('ArrowUp');
		await searchInput.press('ArrowUp');
		await expect(searchOptions.first()).toHaveAttribute('aria-selected', 'true');

		await searchOptions.nth(2).hover();
		await expect(searchOptions.nth(2)).toHaveAttribute('aria-selected', 'true');

		await searchInput.press('Escape');
		await expect(searchInput).toBeHidden();
		await expect(searchOpener).toBeFocused();
		expect(new URL(page.url()).pathname).toBe(paths.locationSinglePoint);
	});

	test('a Theme picked in search scopes the map, and picking it again turns the Scope back on', async ({
		page,
	}) => {
		const { metrics, scopeBar, scopeToggle, searchInput, searchOpener, searchOptions } =
			getAtlas(page);

		await visit(page, paths.themeDetail);

		const title = await getHeading(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, title);
		await expect(searchOptions.first()).toContainText(title);
		await searchOptions.first().click();

		await page.waitForURL(`**${paths.themeDetail}`);

		const scopedMetrics = await expectScopeHeld(page, title);

		await expect(searchOpener).toBeFocused();

		await scopeToggle.click();
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await searchFor(page, title);
		await searchInput.press('Enter');

		await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
		await expect(metrics).toHaveText(scopedMetrics);
		expect(new URL(page.url()).pathname).toBe(paths.themeDetail);
	});

	test('a press outside closes search where focus is, and search and the filter menu take turns', async ({
		page,
	}) => {
		const { searchInput, searchOpener, title } = getAtlas(page);
		const filterButton = page.getByRole('button', {
			name: defaultMapMessages.filterMenuAriaLabel,
		});

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, 'temple');
		await title.click();

		await expect(searchInput).toBeHidden();
		await expect(searchOpener).not.toBeFocused();

		await searchFor(page, 'temple');
		await filterButton.click();

		await expect(searchInput).toBeHidden();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'true');

		await searchOpener.click();

		await expect(searchInput).toBeFocused();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'false');
	});
});

test.describe('search on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

	test('a search pick from a lowered sheet opens its page at half, where the filter menu stays on the map within reach', async ({
		page,
	}) => {
		const { marker, root, searchInput, shell } = getAtlas(page);
		const filterButton = shell.locator(`.${mapControlClassName.filter}`);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await lowerSheet(page);
		await searchFor(page, getSlugQuery(paths.postLocation));
		await searchInput.press('Enter');

		await page.waitForURL(`**${paths.postLocation}`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await filterButton.click();
		await expect(marker).toBeVisible();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'true');

		const menu = page.locator(`[id="${(await filterButton.getAttribute('aria-controls')) ?? ''}"]`);
		const lastChoice = menu.getByRole('listitem').last().getByRole('button').last();

		await expect(menu).toBeInViewport();

		await lastChoice.click();
		await expect(lastChoice).toHaveAttribute('aria-pressed', 'true');
	});
});

test.describe('a sheet on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

	test('an atlas link lands at half with its title in view and its address spent, and no rest moves the camera', async ({
		page,
	}) => {
		const { canvas, handle, marker, root } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);

		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await expectUnderHandle(page, page.locator(atlasSheetStartSelector));
		await expect(page.locator(atlasInlineMapSelector)).toBeHidden();
		await expect(canvas).toBeVisible({ timeout: mapLoadTimeout });
		expect(new URL(page.url()).search).toBe('');
		await expect
			.poll(() => page.evaluate((key) => sessionStorage.getItem(key), atlasReturnStorageKey))
			.toBe(paths.locationSinglePoint);

		await expect(marker).toBeVisible();

		// MapLibre writes the camera into each marker's transform, so an unchanged style means a still camera
		const markerStyle = (await marker.getAttribute('style')) ?? '';

		await lowerSheet(page);
		await handle.press('ArrowUp');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await handle.press('ArrowUp');
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);
		await expect(marker).toHaveAttribute('style', markerStyle);
	});

	test('the sheet lowers without leaving its page, comes back, rises and closes', async ({
		page,
	}) => {
		const { close, handle, root, shell, title } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		const historyLength = await page.evaluate(() => history.length);

		await handle.click();

		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.lowered);
		await expect(handle).toHaveAccessibleName(t('atlas.sheet.raise.label'));
		await expect(handle).toHaveAttribute('aria-expanded', 'false');
		await expect(title).toBeHidden();
		expect(new URL(page.url()).pathname).toBe(paths.locationSinglePoint);
		expect(await page.evaluate(() => history.length)).toBe(historyLength);

		await handle.press('Enter');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await handle.press('ArrowUp');
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);
		await expect(title).toBeVisible();

		await handle.press('ArrowDown');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await close.click();

		await expect(root).not.toHaveAttribute(atlasFlagAttribute);
		await expectShellGone(shell);
		await expect(handle).toBeHidden();
		await expect(page.locator(atlasPaneSelector)).toBeFocused();
		await expect(title).toBeInViewport();
		expect(new URL(page.url()).pathname).toBe(paths.locationSinglePoint);
	});

	test('a Tab onto the handle at half leaves the title where it landed', async ({
		browserName,
		page,
	}) => {
		const { handle, root } = getAtlas(page);
		const start = page.locator(atlasSheetStartSelector);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await expectUnderHandle(page, start);

		// Safari's Tab skips buttons unless Option is held
		await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');

		await expect(handle).toBeFocused();
		await expectUnderHandle(page, start);
	});

	test("a tap on the open Location's own Point brings a lowered sheet back to half with no popup", async ({
		page,
	}) => {
		const { marker, popup, root } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await lowerSheet(page);
		await expect(marker).toBeVisible({ timeout: mapLoadTimeout });

		await marker.click();

		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await expect(popup).toHaveCount(0);
		expect(new URL(page.url()).pathname).toBe(paths.locationSinglePoint);
	});
});

test.describe('the rest a sheet takes on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

	test('the open rest a reader chose decides every later arrival', async ({
		browserName,
		consoleGuard,
		page,
	}) => {
		const { handle, root } = getAtlas(page);

		allowReloadNoise(consoleGuard, browserName);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await handle.press('ArrowUp');
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);

		await visit(page, `${paths.locationMultiPoint}?atlas`);
		await expect(root).toHaveAttribute(atlasPageAttribute, atlasPage.pane);
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(root).toHaveAttribute(atlasPageAttribute, atlasPage.pane);
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);

		await handle.press('ArrowDown');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
	});

	test('half falls to raised when the screen turns, and sideways a chosen half gives way to the height gate', async ({
		browserName,
		consoleGuard,
		page,
	}) => {
		const { canvas, handle, root } = getAtlas(page);

		allowReloadNoise(consoleGuard, browserName);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await handle.press('ArrowUp');
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);
		await handle.press('ArrowDown');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await expect
			.poll(() => page.evaluate((key) => localStorage.getItem(key), atlasSheetRestStorageKey))
			.toBe(atlasSheetRest.half);
		await expect(canvas).not.toHaveCSS(mapInsetProperty, '0px');

		await page.setViewportSize(phoneSidewaysViewport);

		await expect(root).not.toHaveAttribute(atlasSheetAttribute);
		await expect(canvas).toHaveCSS(mapInsetProperty, '0px');

		await page.reload({ waitUntil: 'domcontentloaded' });

		await expect(root).toHaveAttribute(atlasPageAttribute, atlasPage.pane);
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);
		await expect(canvas).toHaveCSS(mapInsetProperty, '0px');

		await handle.press('ArrowDown');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.lowered);

		await handle.press('ArrowUp');
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);
	});
});

test.describe('reading in a sheet on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

	test('a footnote followed at half lands below the map, and a sheet lowered there comes back to it', async ({
		page,
	}) => {
		const { handle, root } = getAtlas(page);
		const footnoteLink = page
			.locator(`${atlasPaneMainSelector} a[href^="#user-content-fn-"]`)
			.first();

		const images = Promise.withResolvers<undefined>();

		await page.route('**/*', async (route) => {
			if (route.request().resourceType() === 'image') await images.promise;

			await route.fallback();
		});

		await visit(page, `${paths.postDetail}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		const footnote = page.locator((await footnoteLink.getAttribute('href')) ?? '');

		await footnoteLink.click();

		await expectUnderHandle(page, footnote);

		// Playwright's scroll into view moves the page; the handle sits in the half rest's scroll padding
		await handle.click({ scroll: 'none' });
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.lowered);
		await expect(footnote).toBeHidden();

		images.resolve(undefined);
		await page.waitForLoadState('load');

		await handle.press('Enter');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await expectUnderHandle(page, footnote);
	});

	test('the globe takes a Region to half and sets its Scope, the bar raises a lowered sheet, and the X leaves the page where it was read', async ({
		page,
	}) => {
		const { close, handle, root, scopeName } = getAtlas(page);
		const beforeMap = page.locator(atlasInlineMapSelector).locator('xpath=preceding-sibling::*[1]');

		await visit(page, paths.regionDetail);

		const regionTitle = await getHeading(page);

		await enterAtlas(page);

		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		expect(
			await page.evaluate((key) => localStorage.getItem(key), atlasSheetRestStorageKey),
		).toBeNull();

		const scopedMetrics = await expectScopeHeld(page, regionTitle);

		await lowerSheet(page);
		await scopeName.click();

		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		expect(new URL(page.url()).pathname).toBe(paths.regionDetail);

		await lowerSheet(page);
		await toggleScope(page, scopedMetrics);

		await handle.press('Enter');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await beforeMap.scrollIntoViewIfNeeded();

		await handle.press('ArrowDown');
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.lowered);

		await close.click();

		await expect(root).not.toHaveAttribute(atlasFlagAttribute);
		await expect(beforeMap).toBeInViewport();
	});
});

test.describe('history on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

	test('the back button returns from a pane page to the atlas page before it', async ({ page }) => {
		const { canvas, root } = getAtlas(page);

		await visit(page, paths.regionDetail);
		await enterAtlas(page);
		await keepCanvas(canvas);

		const regionTitle = await getHeading(page);

		await openInPane(page, getPreviewLink(page));

		await page.goBack();
		await expectHistoryArrival(page, regionTitle);

		await expect(root).toHaveAttribute(atlasPageAttribute, atlasPage.pane);
		await expectSameCanvas(canvas);
	});
});
