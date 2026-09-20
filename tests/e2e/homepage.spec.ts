import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

test('the homepage loads with its chrome and content', async ({ page }) => {
	const response = await visit(page, '/');

	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle(new RegExp(t('site.title')));
	await expect(
		page.getByRole('navigation', { name: t('site.navigation.header.label') }),
	).toBeVisible();
	await expect(page.locator('main')).toBeVisible();
});
