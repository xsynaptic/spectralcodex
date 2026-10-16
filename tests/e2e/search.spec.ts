import type { APIRequestContext } from '@playwright/test';

import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const probeLimit = 8;

async function getChineseTitledEntry(request: APIRequestContext) {
	const index = await request.get(paths.locationsIndex);
	const main = /<main[\s\S]*?<\/main>/.exec(await index.text())?.[0] ?? '';
	const urls = [...main.matchAll(/href="(\/[^"/]+\/)"/g)].map(([, url = '']) => url);

	for (const url of [...new Set(urls)].slice(0, probeLimit)) {
		const response = await request.get(url);
		const html = await response.text();
		const title = /title-ml[^>]*><span lang="zh[^>]*class="cjk-text">([^<]+)</.exec(html)?.[1];

		if (title) return { title, url };
	}

	throw new Error(
		`No Entry among the first ${String(probeLimit)} on ${paths.locationsIndex} has a Chinese title`,
	);
}

test('Pagefind returns a known Entry first', { tag: '@smoke' }, async ({ page, site }) => {
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

	// The shortcut follows the page's user agent, not the machine running the test
	const isMac = await page.evaluate(() => /mac/i.test(navigator.userAgent));

	await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

	await expect(page.locator('pagefind-input input')).toBeFocused();
	await expect(page.getByRole('button', { name: t('site.search.toggle.label') })).toHaveAttribute(
		'aria-expanded',
		'true',
	);
});

test('Pagefind finds an Entry by its whole Chinese title', async ({ page, request }) => {
	const entry = await getChineseTitledEntry(request);

	await visit(page, '/');

	await page.getByRole('button', { name: t('site.search.toggle.label') }).click();

	const searchInput = page.locator('pagefind-input input');

	await expect(searchInput).toBeVisible();
	await searchInput.pressSequentially(entry.title, { delay: 30 });

	const resultLink = page.locator('.pf-result-link').first();

	await expect(resultLink).toBeVisible({ timeout: 10_000 });
	await expect(resultLink).toHaveAttribute('href', entry.url);
});
