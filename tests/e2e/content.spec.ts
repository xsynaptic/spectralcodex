import type { Page } from '@playwright/test';

import { PATHS } from './constants.ts';
import { expect, test } from './fixtures.ts';

async function expectDetailPageRenders(page: Page, path: string) {
	await page.goto(path, { waitUntil: 'domcontentloaded' });

	const heading = page.getByRole('heading', { level: 1 });
	await expect(heading).toBeVisible();
	await expect(heading).not.toBeEmpty();

	await expect(page.locator('time.dt-published').first()).toBeVisible();

	const body = page.locator('article p').first();
	await expect(body).toBeVisible();

	const bodyText = await body.innerText();
	expect(bodyText.trim().length).toBeGreaterThan(50);
}

test.describe('detail pages', () => {
	test('post renders', async ({ page }) => {
		await expectDetailPageRenders(page, PATHS.postDetail);
	});

	test('location renders', async ({ page }) => {
		await expectDetailPageRenders(page, PATHS.locationDetail);
	});
});
