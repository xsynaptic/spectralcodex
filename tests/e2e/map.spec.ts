import type { Page } from '@playwright/test';

import { mapControlClassName } from '@spectralcodex/react-map-component/constants';

import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';

test('the map loads on a Location', { tag: '@smoke' }, async ({ page, site }) => {
	const directoryRequests: Array<string> = [];

	page.on('request', (request) => {
		if (request.url().includes('/api/map/map-directory.json'))
			directoryRequests.push(request.url());
	});

	await visit(page, site.locationDetail);

	const island = page.locator(
		'astro-island[client="visible"][component-export="ReactMapComponent"]',
	);

	await island.scrollIntoViewIfNeeded();

	await expect(island.locator('.maplibregl-marker').first()).toBeVisible({ timeout: 10_000 });
	expect(directoryRequests, 'one directory download').toHaveLength(1);
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

	// The cursor turns to a pointer only once the Point is drawn and takes a click
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
	const popupTitle = island.locator(`.maplibregl-popup .${mapControlClassName.popupTitle}`);

	await expect(popupTitle).toBeVisible({ timeout: 10_000 });
	await expect(popupTitle.locator('a')).toHaveCount(0);
});

test('the only Point of a Location opens no popup and leaves the page where it is', async ({
	page,
	site,
}) => {
	const { island, scrollY } = await clickOwnPoint(page, site.locationDetail);

	await page.waitForTimeout(500);

	await expect(island.locator('.maplibregl-popup')).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

test('a Region map draws its Division from the versioned mask', async ({ page }) => {
	const maskResponse = page.waitForResponse((response) =>
		response.url().includes('/api/map/divisions/tainan.json?v='),
	);

	await visit(page, paths.regionDetail);

	const island = page.locator(
		'astro-island[client="visible"][component-export="ReactMapComponent"]',
	);

	await island.scrollIntoViewIfNeeded();

	const response = await maskResponse;

	expect(response.ok()).toBe(true);
	expect(((await response.json()) as { type: string }).type).toMatch(/^(Multi)?Polygon$/);
});
