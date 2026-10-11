import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

test.use({ colorScheme: 'light' });

test('a chosen colour mode survives a reload without a flash of the other', async ({ page }) => {
	await visit(page, '/');

	const root = page.locator('html');

	await expect(root).toHaveAttribute('data-mode', 'light');

	await page.getByRole('button', { name: t('site.mode.toggle.dark.label') }).click();
	await expect(root).toHaveAttribute('data-mode', 'dark');

	// The system still asks for light, so a light value at any point in the load is a flash
	await page.addInitScript(() => {
		const modesSeen: Array<string | undefined> = [];

		new MutationObserver(() => {
			modesSeen.push(document.documentElement.dataset.mode);
		}).observe(document, { attributeFilter: ['data-mode'], attributes: true, subtree: true });

		Object.assign(window, { modesSeen });
	});

	await page.reload({ waitUntil: 'domcontentloaded' });

	await expect(root).toHaveAttribute('data-mode', 'dark');
	await expect(page.getByRole('button', { name: t('site.mode.toggle.light.label') })).toBeVisible();

	const modesSeen = await page.evaluate(() => (window as { modesSeen?: Array<string> }).modesSeen);

	expect(new Set(modesSeen)).toEqual(new Set(['dark']));
});
