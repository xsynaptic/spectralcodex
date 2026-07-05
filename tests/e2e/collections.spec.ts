import { PATHS } from './constants.ts';
import { expect, test } from './fixtures.ts';

test.describe('collection pages', () => {
	test('/locations/ loads with content', async ({ page }) => {
		const response = await page.goto(PATHS.locationsIndex, { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBe(200);
		await expect(page.locator('main')).toBeVisible();
		await expect(page.locator('main a').first()).toBeVisible();
	});

	test('/locations/2/ is reachable from pagination', async ({ page }) => {
		await page.goto(PATHS.locationsIndex, { waitUntil: 'domcontentloaded' });

		const nextPageLink = page.getByRole('link', { name: 'Next' });
		await expect(nextPageLink).toBeVisible();
		await expect(nextPageLink).toHaveAttribute('href', PATHS.locationsIndexPage2);

		const response = await page.goto(PATHS.locationsIndexPage2, { waitUntil: 'domcontentloaded' });
		expect(response?.status()).toBe(200);
		await expect(page.locator('main')).toBeVisible();
		await expect(page.locator('main a').first()).toBeVisible();
	});
});
