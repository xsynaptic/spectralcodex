import type { Page } from '@playwright/test';

import {
	mapControlClassName,
	mapOpenEventName,
	mapTrackEventName,
} from '@spectralcodex/react-map-component/constants';

import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';

async function recordMapAnswers(page: Page) {
	await page.evaluate(
		([openName, trackName]) => {
			const answers: Array<string> = [];

			Object.assign(window, { mapAnswers: answers });
			document.addEventListener(openName, () => {
				answers.push(openName);
			});
			document.addEventListener(trackName, ({ detail }) => {
				answers.push(detail.name);
			});
		},
		[mapOpenEventName, mapTrackEventName] as const,
	);

	return () => page.evaluate(() => (window as { mapAnswers?: Array<string> }).mapAnswers);
}

async function hoverOwnPoint(page: Page, path: string) {
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
		await page.locator('h1').hover();
		await ownPoint.hover();

		await expect(canvas).toHaveCSS('cursor', 'pointer', { timeout: 500 });
	}).toPass({ timeout: 10_000 });

	return { canvas, island, ownPoint };
}

async function clickOwnPoint(page: Page, path: string) {
	const { island, ownPoint } = await hoverOwnPoint(page, path);
	const scrollY = await page.evaluate(() => window.scrollY);
	const readMapAnswers = await recordMapAnswers(page);

	await ownPoint.click();

	return { island, readMapAnswers, scrollY };
}

test('one of the Points of a Location opens its own popup', async ({ page }) => {
	const { island } = await clickOwnPoint(page, paths.locationMultiPoint);
	const popupTitle = island.locator(`.maplibregl-popup .${mapControlClassName.popupTitle}`);

	await expect(popupTitle).toBeVisible({ timeout: 10_000 });
	await expect(popupTitle.locator('a')).toHaveCount(0);
});

test(
	'a Location map downloads the directory once, and clicking its only Point opens no popup',
	{ tag: '@smoke' },
	async ({ page, site }) => {
		const directoryRequests: Array<string> = [];

		page.on('request', (request) => {
			if (request.url().includes('/api/map/map-directory.json'))
				directoryRequests.push(request.url());
		});

		const { island, readMapAnswers, scrollY } = await clickOwnPoint(page, site.locationDetail);

		expect(directoryRequests, 'one directory download').toHaveLength(1);
		expect(await readMapAnswers()).toEqual([]);
		await expect(island.locator('.maplibregl-popup')).toHaveCount(0);
		expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
	},
);

test('a Point the pointer leaves straight off the map lets go of its hover', async ({ page }) => {
	const { canvas } = await hoverOwnPoint(page, paths.locationSinglePoint);

	await page.locator('h1').hover();

	await expect(canvas).not.toHaveCSS('cursor', 'pointer');
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
