import { getTranslations } from '#lib/i18n/i18n-translations.ts';

import { paths } from './constants.ts';
import { expect, test } from './fixtures.ts';

const t = getTranslations();

const regionsName1 = 'Taiwan';
const regionsName2 = 'Tainan';

test.describe('navigation', () => {
	test('Regions', async ({ page }) => {
		await page.goto('/', { waitUntil: 'domcontentloaded' });

		const nav = page.getByRole('navigation', {
			name: t('site.navigation.header.label'),
		});

		// Hover to reveal depth-1 submenu
		await nav.getByRole('link', { name: t('collection.regions.labelPlural') }).hover();

		// Hover to reveal depth-2 submenu
		const taiwanLink = nav.getByRole('link', { name: regionsName1, exact: true });
		await expect(taiwanLink).toBeVisible();
		await taiwanLink.hover();

		const tainanLink = nav.getByRole('link', {
			name: new RegExp(String.raw`^${regionsName2} \(`),
		});
		await expect(tainanLink).toBeVisible();
		await expect(tainanLink).toHaveAttribute('href', paths.regionDetail);
	});

	test('Current page', async ({ page }) => {
		await page.goto(paths.regionDetailAncestor, { waitUntil: 'domcontentloaded' });

		const nav = page.getByRole('navigation', {
			name: t('site.navigation.header.label'),
		});

		const regionsLink = nav.getByRole('link', { name: t('collection.regions.labelPlural') });

		await expect(regionsLink).toHaveClass(/anchor-active/);
		await expect(regionsLink).not.toHaveAttribute('aria-current');

		await regionsLink.hover();

		const taiwanLink = nav.getByRole('link', { name: regionsName1, exact: true });

		await expect(taiwanLink).toHaveClass(/anchor-active/);
		await expect(taiwanLink).toHaveAttribute('aria-current', 'page');
	});
});
