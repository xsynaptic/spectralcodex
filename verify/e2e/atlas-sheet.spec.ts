import type { Locator, Page } from '@playwright/test';

import { mapInsetProperty } from '@spectralcodex/react-map-component/constants';

import {
	allowReloadNoise,
	enterAtlas,
	expectHistoryArrival,
	expectSameCanvas,
	expectScopeHeld,
	expectShellGone,
	getAtlas,
	getHeading,
	getPreviewLink,
	holdSlide,
	keepCanvas,
	lowerSheet,
	openInPane,
	phoneViewport,
	toggleScope,
	waitForSlide,
} from '#e2e/atlas.ts';
import { paths } from '#e2e/constants.ts';
import { expectMapSettled, mapLoadTimeout } from '#e2e/map.ts';
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
} from '#lib/atlas/atlas-constants.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const phoneSidewaysViewport = { height: 390, width: 844 };

// The map band counts as in viewport, so landing under the handle takes two live boxes
async function expectUnderHandle(page: Page, locator: Locator) {
	await expect(async () => {
		const handleBox = await page.locator(atlasSheetHandleSelector).boundingBox();
		const box = await locator.boundingBox();
		const handleBottom = (handleBox?.y ?? 0) + (handleBox?.height ?? 0);

		expect(Math.abs((box?.y ?? 0) - handleBottom)).toBeLessThanOrEqual(1);
	}).toPass();
}

// Capture runs ahead of the mode's resize listener, whose reset starts transitions of its own
async function recordResizeMidSlide(page: Page) {
	await page.locator(atlasPaneSelector).evaluate((pane, sheetAttribute) => {
		addEventListener(
			'resize',
			() => {
				const isLanded = document.documentElement.hasAttribute(sheetAttribute);

				if (!isLanded && pane.getAnimations().length > 0) {
					Object.assign(globalThis, { isResizedMidSlide: true });
				}
			},
			{ capture: true, once: true },
		);
	}, atlasSheetAttribute);
}

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
		const { marker, popup, root, shell } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await lowerSheet(page);
		await expectMapSettled(shell);

		await marker.click();

		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await expect(popup).toHaveCount(0);
		expect(new URL(page.url()).pathname).toBe(paths.locationSinglePoint);
	});
});

test.describe('the rest a sheet takes on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

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

// Other engines take longer than the slide to apply a viewport size
test.describe('a slide interrupted on a phone viewport', () => {
	test.use({ viewport: phoneViewport });

	test('a turn to a short screen during a slide to half lands the sheet raised', async ({
		page,
	}) => {
		const { handle, root } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);
		await handle.press('ArrowUp');
		await expect(root).not.toHaveAttribute(atlasSheetAttribute);

		await handle.press('ArrowDown');
		await recordResizeMidSlide(page);
		await holdSlide(page);
		await page.setViewportSize(phoneSidewaysViewport);
		await waitForSlide(page);

		expect(await page.evaluate(() => 'isResizedMidSlide' in globalThis)).toBe(true);
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
