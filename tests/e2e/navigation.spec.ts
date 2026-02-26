import { expect, test } from '@playwright/test';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const REGIONS_NAME_1 = 'Taiwan';
const REGIONS_NAME_2 = 'Tainan';
const REGIONS_NAME_3 = 'Tainan City';
const REGIONS_URL = '/regions/tainan-city/';

test.describe('navigation', () => {
	test.describe.configure({ retries: 3 });
	test('Regions', async ({ page }) => {
		await page.goto('/');

		const nav = page.getByRole('navigation', {
			name: t('site.menu.header.label'),
		});

		// Hover to reveal depth-1 submenu
		await nav.getByRole('link', { name: t('collection.regions.labelPlural') }).hover();

		// Hover to reveal depth-2 submenu
		const taiwanLink = nav.getByRole('link', { name: REGIONS_NAME_1, exact: true });
		await expect(taiwanLink).toBeVisible();
		await taiwanLink.hover();

		// Hover to reveal depth-3 submenu
		const tainanLink = nav.getByRole('link', {
			name: new RegExp(String.raw`^${REGIONS_NAME_2} \(`),
		});
		await expect(tainanLink).toBeVisible();
		await tainanLink.hover();

		// Click submenu link and assert URL
		const tainanCityLink = nav.getByRole('link', {
			name: new RegExp(String.raw`^${REGIONS_NAME_3} \(`),
		});
		await expect(tainanCityLink).toBeVisible();
		await tainanCityLink.click();

		await expect(page).toHaveURL(new RegExp(REGIONS_URL));
	});
});
