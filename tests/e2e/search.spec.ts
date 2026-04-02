import { expect, test } from '@playwright/test';

const SEARCH_TERM = 'Huadong Valley Ride 2018: Taitung City';

test.describe('search', () => {
	test('Pagefind returns results for a known post', async ({ page }) => {
		await page.goto('/');

		const searchInput = page.locator('.pagefind-ui__search-input');
		await expect(searchInput).toBeVisible();

		await searchInput.click();
		await searchInput.pressSequentially(SEARCH_TERM, { delay: 30 });

		const resultsArea = page.locator('.pagefind-ui__results-area');

		// Results appear (index loaded, search executed)
		await expect(resultsArea.locator('.pagefind-ui__result-link').first()).toBeVisible({
			timeout: 10_000,
		});

		// The specific post appears as a result link
		await expect(
			resultsArea.getByRole('link', { name: 'Huadong Valley Ride 2018: Taitung City' }),
		).toBeVisible();
	});
});
