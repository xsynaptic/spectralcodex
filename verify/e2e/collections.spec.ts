import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

test('the Next link reaches page two', { tag: '@smoke' }, async ({ page }) => {
	const response = await visit(page, paths.locationsIndex);

	expect(response?.status()).toBe(200);

	const nextPageLink = page.getByRole('link', { name: t('pagination.next') });

	await expect(nextPageLink).toHaveAttribute('href', paths.locationsIndexPage2);

	await nextPageLink.click();
	await expect(page).toHaveURL(paths.locationsIndexPage2);
	await expect(page.locator('main a').first()).toBeVisible();
});
