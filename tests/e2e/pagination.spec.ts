import { getTranslations } from '#lib/i18n/i18n-translations.ts';
import { formatStringTemplate } from '#lib/utils/text.ts';

import { PATHS } from './constants.ts';
import { expect, test } from './fixtures.ts';

const t = getTranslations();

function getPageOptionLabel(pageNumber: number): string {
	return formatStringTemplate(t('site.pagination.pageNumber.label'), { page: pageNumber });
}

test.describe('pagination select', () => {
	test('navigates via the select dropdown on /locations/', async ({ page }) => {
		await page.goto(PATHS.locationsIndex, { waitUntil: 'domcontentloaded' });

		const select = page.getByRole('combobox', { name: t('site.pagination.select.label') });
		const goButton = page.getByRole('button', { name: t('site.pagination.select.submit') });

		// page 1 -> page 2; assert against baseURL so a cross-origin jump fails here
		await select.selectOption({ label: getPageOptionLabel(2) });
		await goButton.click();
		await expect(page).toHaveURL(PATHS.locationsIndexPage2);

		// page 2 -> page 1 resolves to the base path with no /1/ suffix
		await select.selectOption({ label: getPageOptionLabel(1) });
		await goButton.click();
		await expect(page).toHaveURL(PATHS.locationsIndex);
	});
});
