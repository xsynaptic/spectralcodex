import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

import { paths } from './constants.ts';
import { expect, test } from './fixtures.ts';

const t = getTranslations();

function getPageOptionLabel(pageNumber: number): string {
	return formatStringTemplate(t('site.pagination.pageNumber.label'), { page: pageNumber });
}

test.describe('pagination select', () => {
	// Going back to page 1 also covers the base path resolving with no /1/ suffix
	test('a change without pointer intent waits for Go', async ({ page }) => {
		await page.goto(paths.locationsIndexPage2, { waitUntil: 'domcontentloaded' });

		const select = page.getByRole('combobox', { name: t('site.pagination.select.label') });
		const goButton = page.getByRole('button', { name: t('site.pagination.select.submit') });

		await expect(select).toBeVisible();
		await select.selectOption({ label: getPageOptionLabel(1) });

		await expect(page).toHaveURL(paths.locationsIndexPage2);

		// Assert against baseURL so a cross-origin jump fails here
		await goButton.click();
		await expect(page).toHaveURL(paths.locationsIndex);
	});

	test('a pointer-driven change navigates immediately', async ({ page }) => {
		await page.goto(paths.locationsIndex, { waitUntil: 'domcontentloaded' });

		const select = page.getByRole('combobox', { name: t('site.pagination.select.label') });

		// dispatchEvent waits only for attachment; a visible form means the listener is bound
		await expect(select).toBeVisible();

		// Stands in for opening the picker, which Playwright cannot drive on a native select
		await select.dispatchEvent('pointerdown');
		await select.selectOption({ label: getPageOptionLabel(2) });

		await expect(page).toHaveURL(paths.locationsIndexPage2);
	});
});

test.describe('pagination select on a coarse pointer', () => {
	// A device descriptor cannot go in a describe; these are what make the pointer coarse
	test.use({ viewport: { width: 393, height: 851 }, hasTouch: true, isMobile: true });

	test('a pointer-driven change still waits for Go', async ({ page }) => {
		await page.goto(paths.locationsIndex, { waitUntil: 'domcontentloaded' });

		const select = page.getByRole('combobox', { name: t('site.pagination.select.label') });
		const goButton = page.getByRole('button', { name: t('site.pagination.select.submit') });

		await expect(select).toBeVisible();
		await select.dispatchEvent('pointerdown');
		await select.selectOption({ label: getPageOptionLabel(2) });

		await expect(page).toHaveURL(paths.locationsIndex);

		await goButton.click();
		await expect(page).toHaveURL(paths.locationsIndexPage2);
	});
});
