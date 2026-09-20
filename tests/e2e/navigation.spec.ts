import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const regionAncestorTitle = 'Taiwan';
const regionTitle = 'Tainan';

test('a submenu reveals on hover, two levels deep', async ({ page }) => {
	await visit(page, '/');

	const nav = page.getByRole('navigation', { name: t('site.navigation.header.label') });

	await nav.getByRole('link', { name: t('collection.regions.labelPlural') }).hover();

	const ancestorLink = nav.getByRole('link', { exact: true, name: regionAncestorTitle });

	await expect(ancestorLink).toBeVisible();
	await ancestorLink.hover();

	const regionLink = nav.getByRole('link', {
		name: new RegExp(String.raw`^${regionTitle} \(`),
	});

	await expect(regionLink).toBeVisible();
	await expect(regionLink).toHaveAttribute('href', paths.regionDetail);
});

test('the current page is the only one marked', async ({ page }) => {
	await visit(page, paths.regionDetailAncestor);

	const nav = page.getByRole('navigation', { name: t('site.navigation.header.label') });
	const regionsLink = nav.getByRole('link', { name: t('collection.regions.labelPlural') });

	await expect(regionsLink).toHaveClass(/anchor-active/);
	await expect(regionsLink).not.toHaveAttribute('aria-current');

	await regionsLink.hover();

	const ancestorLink = nav.getByRole('link', { exact: true, name: regionAncestorTitle });

	await expect(ancestorLink).toHaveClass(/anchor-active/);
	await expect(ancestorLink).toHaveAttribute('aria-current', 'page');
});

test('a header link navigates client-side and the chrome survives the swap', async ({ page }) => {
	await visit(page, paths.postsIndex);

	// A window property dies with its document, where a `load` count races the URL assertion on a slow host
	await page.evaluate(() => Object.assign(window, { survivesSwap: true }));

	await page
		.getByRole('navigation', { name: t('site.navigation.header.label') })
		.getByRole('link', { exact: true, name: t('collection.locations.labelPlural') })
		.click();

	await expect(page).toHaveURL(paths.locationsIndex);
	expect(
		await page.evaluate(() => 'survivesSwap' in window),
		'the swap reloaded the document',
	).toBe(true);

	await page.getByRole('button', { name: t('site.search.toggle.label') }).click();
	await expect(page.locator('pagefind-input input')).toBeVisible();
});
