import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

test('a Collection index loads with content', async ({ page }) => {
	const response = await visit(page, paths.locationsIndex);

	expect(response?.status()).toBe(200);
	await expect(page.locator('main')).toBeVisible();
	await expect(page.locator('main a').first()).toBeVisible();
});

test('the Next link reaches page two', async ({ page }) => {
	await visit(page, paths.locationsIndex);

	const nextPageLink = page.getByRole('link', { name: t('pagination.next') });

	await expect(nextPageLink).toHaveAttribute('href', paths.locationsIndexPage2);

	await nextPageLink.click();
	await expect(page).toHaveURL(paths.locationsIndexPage2);
	await expect(page.locator('main a').first()).toBeVisible();
});
