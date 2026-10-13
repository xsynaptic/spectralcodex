import type { Page } from '@playwright/test';

import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';

test('the map loads on a Location', { tag: '@smoke' }, async ({ page, site }) => {
	await visit(page, site.locationDetail);

	// The island is server-rendered; the canvas only follows once client:visible hydrates it
	const island = page.locator(
		'astro-island[client="visible"][component-export="ReactMapComponent"]',
	);

	await island.scrollIntoViewIfNeeded();

	await expect(island.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10_000 });
});

async function clickOwnPoint(page: Page, path: string) {
	await visit(page, path);

	const island = page.locator(
		'astro-island[client="visible"][component-export="ReactMapComponent"]',
	);
	const canvas = island.locator('canvas.maplibregl-canvas');
	const ownPoint = island.locator('.maplibregl-marker').first();

	await island.scrollIntoViewIfNeeded();
	await expect(ownPoint).toBeVisible({ timeout: 10_000 });

	// A pointer cursor means the Point under the ring is drawn and takes a click
	await expect(async () => {
		await page.mouse.move(0, 0);
		await ownPoint.hover();

		await expect(canvas).toHaveCSS('cursor', 'pointer', { timeout: 500 });
	}).toPass({ timeout: 10_000 });

	const scrollY = await page.evaluate(() => window.scrollY);

	await ownPoint.click();

	return { island, scrollY };
}

test('one of the Points of a Location opens its own popup', async ({ page }) => {
	const { island } = await clickOwnPoint(page, paths.locationMultiPoint);
	const popupTitle = island.locator('.maplibregl-popup .map-popup-title');

	await expect(popupTitle).toBeVisible({ timeout: 10_000 });
	await expect(popupTitle.locator('a')).toHaveCount(0);
});

test('the only Point of a Location opens no popup and leaves the page where it is', async ({
	page,
	site,
}) => {
	const { island, scrollY } = await clickOwnPoint(page, site.locationDetail);

	// A popup would have opened by now
	await page.waitForTimeout(500);

	await expect(island.locator('.maplibregl-popup')).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});
