import type { Page } from '@playwright/test';

import { expect, test, visit } from '#e2e/test.ts';

const bodyLengthMinimum = 50;

async function expectEntryRenders(page: Page, path: string): Promise<void> {
	await visit(page, path);

	const heading = page.getByRole('heading', { level: 1 });

	await expect(heading).toBeVisible();
	await expect(heading).not.toBeEmpty();
	await expect(page.locator('time.dt-published').first()).toBeVisible();

	const body = page.locator('article p').first();

	await expect(body).toBeVisible();

	const bodyText = await body.innerText();

	expect(bodyText.trim().length).toBeGreaterThan(bodyLengthMinimum);
}

test('a Post renders', async ({ page, site }) => {
	await expectEntryRenders(page, site.postDetail);
});

test('a Location renders', async ({ page, site }) => {
	await expectEntryRenders(page, site.locationDetail);
});
