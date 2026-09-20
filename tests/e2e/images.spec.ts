import type { Locator, Page } from '@playwright/test';

import { expect, test, visit } from '#e2e/test.ts';

const heroWidthMaximum = 1800;
const contentWidthMaximum = 1400;
const mobileWidthMaximum = 600;

function getContentImage(page: Page): Locator {
	return page.locator('.e-content img').first();
}

function getHeroImage(page: Page): Locator {
	return page.locator('img[fetchpriority="high"]').first();
}

// currentSrc reflects the browser's per-viewport selection without fetching bytes; stays hermetic
async function getSelectedWidth(image: Locator): Promise<number> {
	await image.scrollIntoViewIfNeeded();
	await expect
		.poll(() => image.evaluate((element: HTMLImageElement) => element.currentSrc))
		.not.toBe('');

	const currentSrc = await image.evaluate((element: HTMLImageElement) => element.currentSrc);
	const width = Number(/\/(\d+)x\d+\//.exec(currentSrc)?.[1]);

	if (!Number.isFinite(width)) throw new Error(`No width segment in currentSrc: ${currentSrc}`);

	return width;
}

test.describe('on a desktop viewport', () => {
	test.use({ viewport: { height: 720, width: 1280 } });

	test('the hero selects an optimized width', async ({ page, site }) => {
		await visit(page, site.postDetail);

		expect(await getSelectedWidth(getHeroImage(page))).toBeLessThanOrEqual(heroWidthMaximum);
	});

	test('the first content image selects an optimized width', async ({ page, site }) => {
		await visit(page, site.postDetail);

		expect(await getSelectedWidth(getContentImage(page))).toBeLessThanOrEqual(contentWidthMaximum);
	});
});

test.describe('on a phone viewport', () => {
	test.use({ viewport: { height: 844, width: 390 } });

	test('the hero selects a smaller width', async ({ page, site }) => {
		await visit(page, site.postDetail);

		expect(await getSelectedWidth(getHeroImage(page))).toBeLessThanOrEqual(mobileWidthMaximum);
	});

	test('the first content image selects a smaller width', async ({ page, site }) => {
		await visit(page, site.postDetail);

		expect(await getSelectedWidth(getContentImage(page))).toBeLessThanOrEqual(mobileWidthMaximum);
	});
});
