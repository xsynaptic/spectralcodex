import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

test('Pagefind returns a known Entry first', async ({ page, site }) => {
	await visit(page, '/');

	await page.getByRole('button', { name: t('site.search.toggle.label') }).click();

	const searchInput = page.locator('pagefind-input input');

	await expect(searchInput).toBeVisible();
	await searchInput.pressSequentially(site.postTitle, { delay: 30 });

	const resultLink = page.locator('.pf-result-link').first();

	await expect(resultLink).toBeVisible({ timeout: 10_000 });
	await expect(resultLink).toHaveAttribute('href', site.postDetail);
});
