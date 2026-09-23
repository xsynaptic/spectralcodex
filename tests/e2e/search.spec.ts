import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

test('Pagefind returns a known Entry first', async ({ page, site }) => {
	await visit(page, '/');

	await page.getByRole('button', { name: t('site.search.toggle.label') }).click();

	const searchInput = page.locator('pagefind-input input');

	await expect(searchInput).toBeVisible();
	await searchInput.pressSequentially(site.postTitle, { delay: 30 });

	const resultLink = page.locator('.pf-result-link').first();

	await expect(resultLink).toBeVisible({ timeout: 10_000 });
	await expect(resultLink).toHaveAttribute('href', site.postDetail);
});

test('a click opens search from a cold start', async ({ page }) => {
	await visit(page, '/');

	expect(await page.evaluate(() => customElements.get('pagefind-modal') === undefined)).toBe(true);

	const toggle = page.getByRole('button', { name: t('site.search.toggle.label') });

	await toggle.click();

	await expect(page.locator('pagefind-input input')).toBeFocused();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
});

test('the shortcut opens search from a cold start without dropping the keypress', async ({
	page,
}) => {
	await visit(page, '/');

	expect(await page.evaluate(() => customElements.get('pagefind-modal') === undefined)).toBe(true);

	// The toggle picks the modifier from the page's user agent, not the host running the test
	const isMac = await page.evaluate(() => /mac/i.test(navigator.userAgent));

	await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

	await expect(page.locator('pagefind-input input')).toBeFocused();
	await expect(page.getByRole('button', { name: t('site.search.toggle.label') })).toHaveAttribute(
		'aria-expanded',
		'true',
	);
});
