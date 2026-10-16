import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

const t = getTranslations();

function getPageOptionLabel(pageNumber: number): string {
	return formatStringTemplate(t('site.pagination.pageNumber.label'), { page: pageNumber });
}

test('a change without pointer intent waits for Go', async ({ page }) => {
	await visit(page, paths.locationsIndexPage2);

	const select = page.getByRole('combobox', { name: t('site.pagination.select.label') });
	const goButton = page.getByRole('button', { name: t('site.pagination.select.submit') });

	await expect(select).toBeVisible();
	await select.selectOption({ label: getPageOptionLabel(1) });

	await expect(page).toHaveURL(paths.locationsIndexPage2);

	await goButton.click();
	await expect(page).toHaveURL(paths.locationsIndex);
});

test('a pointer-driven change navigates immediately', async ({ page }) => {
	await visit(page, paths.locationsIndex);

	const select = page.getByRole('combobox', { name: t('site.pagination.select.label') });

	// `dispatchEvent` only waits for the element to attach, and a visible form means its listener is bound
	await expect(select).toBeVisible();

	// Playwright cannot open a native select's picker, so this stands in for it
	await select.dispatchEvent('pointerdown');
	await select.selectOption({ label: getPageOptionLabel(2) });

	await expect(page).toHaveURL(paths.locationsIndexPage2);
});

test('a pointer-driven year pick on the Chronology index navigates to that year', async ({
	page,
}) => {
	await visit(page, paths.chronologyIndex);

	const select = page.getByRole('combobox', { name: t('chronology.yearly.select.label') });

	await expect(select).toBeVisible();
	await select.dispatchEvent('pointerdown');
	await select.selectOption({ value: paths.chronologyYear });

	await expect(page).toHaveURL(paths.chronologyYear);
});

test.describe('on a coarse pointer', () => {
	// A device descriptor can't be used inside a describe block, so these set a coarse pointer by hand
	test.use({ hasTouch: true, isMobile: true, viewport: { height: 851, width: 393 } });

	test('a pointer-driven change still waits for Go', async ({ page }) => {
		await visit(page, paths.locationsIndex);

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
