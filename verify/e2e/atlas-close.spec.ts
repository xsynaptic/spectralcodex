import type { Page } from '@playwright/test';

import { test as baseTest } from '@playwright/test';

import {
	atlasPath,
	getAtlas,
	getSlugQuery,
	holdSlide,
	lowerSheet,
	phoneViewport,
	searchFor,
	waitForSlide,
} from '#e2e/atlas.ts';
import { paths } from '#e2e/constants.ts';
import { mapLoadTimeout } from '#e2e/map.ts';
import { expect, test, visit } from '#e2e/test.ts';
import {
	atlasFlagAttribute,
	atlasFlagStorageKey,
	atlasPage,
	atlasPageAttribute,
	atlasPaneSelector,
	atlasSheetAttribute,
	atlasSheetRest,
} from '#lib/atlas/atlas-constants.ts';

async function recordSwapMidSlide(page: Page) {
	await page.locator(atlasPaneSelector).evaluate(
		(pane, { lowered, sheetAttribute }) => {
			document.addEventListener(
				'astro:before-swap',
				() => {
					const isLowered = document.documentElement.getAttribute(sheetAttribute) === lowered;

					if (isLowered && pane.getAnimations().length > 0) {
						Object.assign(globalThis, { isSwappedMidSlide: true });
					}
				},
				{ once: true },
			);
		},
		{ lowered: atlasSheetRest.lowered, sheetAttribute: atlasSheetAttribute },
	);
}

// Fetched before the hold, since a dev render outlasts the slide
async function holdResponse(page: Page, path: string) {
	const fetched = Promise.withResolvers<undefined>();
	const delivery = Promise.withResolvers<undefined>();

	await page.route(`**${path}`, async (route) => {
		const response = await route.fetch();

		fetched.resolve(undefined);
		await delivery.promise;
		await route.fulfill({ response });
	});

	return {
		fetched: fetched.promise,
		release: () => {
			delivery.resolve(undefined);
		},
	};
}

function isSwappedMidSlide(page: Page) {
	return page.evaluate(() => 'isSwappedMidSlide' in globalThis);
}

function readFlagStore(page: Page) {
	return page.evaluate((key) => sessionStorage.getItem(key), atlasFlagStorageKey);
}

async function trackRestore(page: Page) {
	await page.addInitScript(() => {
		addEventListener('pageshow', (event) => {
			if (event.persisted) Object.assign(globalThis, { isRestored: true });
		});
	});
}

function isRestored(page: Page) {
	return page.evaluate(() => 'isRestored' in globalThis);
}

test.describe('closing the atlas on a phone viewport', () => {
	test.use({ viewport: phoneViewport });

	test('a back press during the X slide lands on the atlas page with the map still on', async ({
		page,
	}) => {
		const { canvas, close, root, searchInput } = getAtlas(page);

		await visit(page, paths.regionDetail);
		await visit(page, atlasPath);
		await expect(canvas).toBeVisible({ timeout: mapLoadTimeout });
		await searchFor(page, getSlugQuery(paths.locationSinglePoint));
		await searchInput.press('Enter');
		await page.waitForURL(`**${paths.locationSinglePoint}`);

		await lowerSheet(page);
		await close.click();
		await holdSlide(page);
		await page.goBack();

		await page.waitForURL(`**${atlasPath}`, { waitUntil: 'commit' });
		await expect(root).toHaveAttribute(atlasPageAttribute, atlasPage.map);
		await waitForSlide(page);

		await expect(root).toHaveAttribute(atlasFlagAttribute);
		expect(new URL(page.url()).pathname).toBe(atlasPath);
	});

	test('a navigation to a page without a map that lands during the X slide leaves the atlas off', async ({
		page,
	}) => {
		const { close, root } = getAtlas(page);
		const postsResponse = await holdResponse(page, paths.postsIndex);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await page.locator(`header a[href="${paths.postsIndex}"]`).first().click();
		await lowerSheet(page);
		await postsResponse.fetched;
		await close.click();
		await recordSwapMidSlide(page);
		await holdSlide(page);
		postsResponse.release();

		await expect(root).not.toHaveAttribute(atlasPageAttribute);
		await waitForSlide(page);

		expect(await isSwappedMidSlide(page)).toBe(true);
		await expect(root).not.toHaveAttribute(atlasFlagAttribute);
		expect(await readFlagStore(page)).toBeNull();
	});

	test('a navigation to the atlas page that lands during the X slide keeps the reader there', async ({
		page,
	}) => {
		const { close, root } = getAtlas(page);
		const atlasResponse = await holdResponse(page, atlasPath);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		const historyLength = await page.evaluate(() => history.length);

		await page.locator(`header a[href="${atlasPath}"]`).first().click();
		await lowerSheet(page);
		await atlasResponse.fetched;
		await close.click();
		await recordSwapMidSlide(page);
		await holdSlide(page);
		atlasResponse.release();

		await expect(root).toHaveAttribute(atlasPageAttribute, atlasPage.map);
		await waitForSlide(page);

		expect(await isSwappedMidSlide(page)).toBe(true);
		await expect(root).toHaveAttribute(atlasFlagAttribute);
		expect(await readFlagStore(page)).toBe('1');
		expect(await page.evaluate(() => history.length)).toBe(historyLength + 1);
		expect(new URL(page.url()).pathname).toBe(atlasPath);
	});
});

baseTest.describe('the back/forward cache on a phone viewport', { tag: '@bfcache' }, () => {
	baseTest.use({ viewport: phoneViewport });

	baseTest(
		'the X on an atlas page opened by address restores the page before it without the atlas, and forward restores the atlas',
		async ({ page }) => {
			const { canvas, close, root } = getAtlas(page);

			await trackRestore(page);
			await page.goto(`${paths.locationSinglePoint}?atlas`, { waitUntil: 'networkidle' });
			await expect(root).toHaveAttribute(atlasFlagAttribute);

			await visit(page, atlasPath);
			await expect(canvas).toBeVisible({ timeout: mapLoadTimeout });

			await close.click();
			await page.waitForURL(`**${paths.locationSinglePoint}`, { waitUntil: 'commit' });

			await expect.poll(() => isRestored(page)).toBe(true);
			await expect(root).not.toHaveAttribute(atlasFlagAttribute);
			expect(await readFlagStore(page)).toBeNull();

			await page.goForward({ waitUntil: 'commit' });
			await page.waitForURL(`**${atlasPath}`, { waitUntil: 'commit' });

			await expect.poll(() => isRestored(page)).toBe(true);
			await expect(root).toHaveAttribute(atlasFlagAttribute);
			await expect(canvas).toBeVisible();
			expect(await readFlagStore(page)).toBe('1');
		},
	);

	baseTest(
		'back from an atlas page opened by address restores the page before it with the atlas on',
		async ({ page }) => {
			const { canvas, root } = getAtlas(page);

			await trackRestore(page);
			await page.goto(paths.locationSinglePoint, { waitUntil: 'networkidle' });
			await expect(root).not.toHaveAttribute(atlasFlagAttribute);

			await visit(page, atlasPath);
			await expect(canvas).toBeVisible({ timeout: mapLoadTimeout });

			await page.goBack({ waitUntil: 'commit' });
			await page.waitForURL(`**${paths.locationSinglePoint}`, { waitUntil: 'commit' });

			await expect.poll(() => isRestored(page)).toBe(true);
			await expect(root).toHaveAttribute(atlasFlagAttribute);
			await expect(canvas).toBeVisible({ timeout: mapLoadTimeout });
			expect(await readFlagStore(page)).toBe('1');
		},
	);
});
