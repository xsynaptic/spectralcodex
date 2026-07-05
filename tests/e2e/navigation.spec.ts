import { getTranslations } from '#lib/i18n/i18n-translations.ts';

import { PATHS } from './constants.ts';
import { expect, test } from './fixtures.ts';

const t = getTranslations();

const REGIONS_NAME_1 = 'Taiwan';
const REGIONS_NAME_2 = 'Tainan';

test.describe('navigation', () => {
	test('Regions', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const nav = page.getByRole('navigation', {
			name: t('site.menu.header.label'),
		});

		// Hover to reveal depth-1 submenu
		await nav.getByRole('menuitem', { name: t('collection.regions.labelPlural') }).hover();

		// Hover to reveal depth-2 submenu
		const taiwanLink = nav.getByRole('menuitem', { name: REGIONS_NAME_1, exact: true });
		await expect(taiwanLink).toBeVisible();
		await taiwanLink.hover();

		const tainanLink = nav.getByRole('menuitem', {
			name: new RegExp(String.raw`^${REGIONS_NAME_2} \(`),
		});
		await expect(tainanLink).toBeVisible();
		await expect(tainanLink).toHaveAttribute('href', new RegExp(`${PATHS.regionDetail}$`));
	});
});
