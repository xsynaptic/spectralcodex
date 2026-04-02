import { expect, test } from '@playwright/test';

test.describe('collection pages', () => {
	test('/locations/ loads with content', async ({ page }) => {
		const response = await page.goto('/locations/');

		expect(response?.status()).toBe(200);
		await expect(page.locator('main')).toBeVisible();
		await expect(page.locator('main a').first()).toBeVisible();
	});

	test('/locations/2/ is reachable from pagination', async ({ page }) => {
		await page.goto('/locations/');

		const nextPageLink = page.getByRole('link', { name: 'Next' });
		await expect(nextPageLink).toBeVisible();
		await nextPageLink.click();

		await expect(page).toHaveURL(/\/locations\/2\/?/);
		await expect(page.locator('main')).toBeVisible();
		await expect(page.locator('main a').first()).toBeVisible();
	});
});
