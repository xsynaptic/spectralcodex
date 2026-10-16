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

test('the keyboard opens a submenu and Escape hands focus back to its trigger', async ({
	page,
}) => {
	await visit(page, '/');

	const nav = page.getByRole('navigation', { name: t('site.navigation.header.label') });
	const trigger = nav.getByRole('link', { name: t('collection.regions.labelPlural') });

	// The element sets `aria-expanded` only once it is listening for keys
	await expect(trigger).toHaveAttribute('aria-expanded', 'false');

	await trigger.focus();
	await page.keyboard.press('ArrowDown');

	const submenu = nav.locator(`[id="${(await trigger.getAttribute('aria-controls')) ?? ''}"]`);

	await expect(trigger).toHaveAttribute('aria-expanded', 'true');
	await expect(submenu.getByRole('link').first()).toBeFocused();

	await page.keyboard.press('Escape');

	await expect(trigger).toHaveAttribute('aria-expanded', 'false');
	await expect(trigger).toBeFocused();
	await expect(submenu).toBeHidden();
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

test(
	'a header link navigates client-side and the chrome survives the swap',
	{ tag: '@smoke' },
	async ({ page }) => {
		await visit(page, paths.postsIndex);

		// A window property is lost when the document is replaced, whereas counting `load` events races the URL check on a slow host
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
	},
);
