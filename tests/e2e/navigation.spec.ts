import { expect, test } from '@playwright/test';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const REGIONS_NAME_1 = 'Taiwan';
const REGIONS_NAME_2 = 'Tainan';
const REGIONS_URL = '/regions/tainan/';

test.describe('navigation', () => {
	test('Regions', async ({ page }) => {
		await page.goto('/');

		const nav = page.getByRole('navigation', {
			name: t('site.menu.header.label'),
		});

		// Hover to reveal depth-1 submenu
		await nav.getByRole('menuitem', { name: t('collection.regions.labelPlural') }).hover();

		// Hover to reveal depth-2 submenu
		const taiwanLink = nav.getByRole('menuitem', { name: REGIONS_NAME_1, exact: true });
		await expect(taiwanLink).toBeVisible();
		await taiwanLink.hover();

		// Click depth-2 submenu link and assert URL
		const tainanLink = nav.getByRole('menuitem', {
			name: new RegExp(String.raw`^${REGIONS_NAME_2} \(`),
		});
		await expect(tainanLink).toBeVisible();
		await tainanLink.click();

		await expect(page).toHaveURL(new RegExp(REGIONS_URL));
	});
});
