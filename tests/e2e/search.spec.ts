import { expect, test } from '@playwright/test';

const SEARCH_TERM = 'Huadong Valley Ride 2018: Taitung City';

test.describe('search', () => {
	test('Pagefind returns results for a known post', async ({ page }) => {
		await page.goto('/');

		const trigger = page.locator('pagefind-modal-trigger button');
		await expect(trigger).toBeVisible();
		await trigger.click();

		const searchInput = page.locator('pagefind-input input');
		await expect(searchInput).toBeVisible();
		await searchInput.pressSequentially(SEARCH_TERM, { delay: 30 });

		const resultLink = page.locator('.pf-result-link').first();
		await expect(resultLink).toBeVisible({ timeout: 10_000 });

		// The specific post appears as a result link
		await expect(resultLink).toHaveText(SEARCH_TERM);
	});
});
