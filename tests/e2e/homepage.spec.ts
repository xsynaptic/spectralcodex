import { getTranslations } from '#lib/i18n/i18n-translations.ts';

import { expect, test } from './fixtures.ts';

const t = getTranslations();

test.describe('homepage', () => {
	test('loads with site chrome and content', async ({ page }) => {
		const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

		expect(response?.status()).toBe(200);
		await expect(page).toHaveTitle(new RegExp(t('site.title')));
		await expect(page.getByRole('navigation', { name: t('site.menu.header.label') })).toBeVisible();
		await expect(page.locator('main')).toBeVisible();
	});
});
