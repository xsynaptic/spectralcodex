import type { Locator } from '@playwright/test';

import { PATHS } from './constants.ts';
import { expect, test } from './fixtures.ts';

// currentSrc reflects the browser's per-viewport selection without fetching bytes; stays hermetic
async function getSelectedWidth(img: Locator): Promise<number> {
	await img.scrollIntoViewIfNeeded();
	await expect
		.poll(() => img.evaluate((element: HTMLImageElement) => element.currentSrc))
		.not.toBe('');

	const currentSrc = await img.evaluate((element: HTMLImageElement) => element.currentSrc);
	const width = Number(/\/(\d+)x\d+\//.exec(currentSrc)?.[1]);
	if (!Number.isFinite(width)) throw new Error(`No width segment in currentSrc: ${currentSrc}`);

	return width;
}

test.describe('images - desktop (1280x720)', () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test('hero selects an optimized width', async ({ page }) => {
		await page.goto(PATHS.postDetail, { waitUntil: 'domcontentloaded' });

		const width = await getSelectedWidth(page.locator('img').first());

		expect(width).toBeLessThanOrEqual(1800);
	});

	test('first content image selects an optimized width', async ({ page }) => {
		await page.goto(PATHS.postDetail, { waitUntil: 'domcontentloaded' });

		const width = await getSelectedWidth(page.locator('article img, main img').nth(1));

		expect(width).toBeLessThanOrEqual(1400);
	});
});

test.describe('images - mobile (390x844)', () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test('hero selects a smaller width than desktop', async ({ page }) => {
		await page.goto(PATHS.postDetail, { waitUntil: 'domcontentloaded' });

		const width = await getSelectedWidth(page.locator('img').first());

		expect(width).toBeLessThanOrEqual(600);
	});

	test('first content image selects a smaller width than desktop', async ({ page }) => {
		await page.goto(PATHS.postDetail, { waitUntil: 'domcontentloaded' });

		const width = await getSelectedWidth(page.locator('article img, main img').nth(1));

		expect(width).toBeLessThanOrEqual(600);
	});
});
