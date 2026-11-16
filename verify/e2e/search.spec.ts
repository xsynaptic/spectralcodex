import type { APIRequestContext, Page } from '@playwright/test';

import { paths } from '#e2e/constants.ts';
import { expect, navigateClientSide, test, visit } from '#e2e/test.ts';
import { getTracked, recordTracking } from '#e2e/tracking.ts';
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

	expect(await page.evaluate(() => customElements.get('pagefind-modal') === undefined)).toBe(true);

	await page.getByRole('button', { name: t('site.search.toggle.label') }).click();

	const searchInput = page.locator('pagefind-input input');

	await expect(searchInput).toBeVisible();
	await searchInput.pressSequentially(site.postTitle, { delay: 30 });

	const resultLink = page.locator('.pf-result-link').first();

	await expect(resultLink).toBeVisible({ timeout: 10_000 });
	await expect(resultLink).toHaveAttribute('href', site.postDetail);
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

async function searchFor(page: Page, query: string) {
	const searchInput = page.locator('pagefind-input input');
	const summary = page.locator('pagefind-summary');

	await page.getByRole('button', { name: t('site.search.toggle.label') }).click();
	await expect(searchInput).toBeFocused();
	await searchInput.pressSequentially(query, { delay: 30 });
	await expect(summary).toContainText(query, { timeout: 10_000 });
	await expect(summary).not.toContainText('Searching');
}

test('search analytics survive client-side navigation', async ({ page, site }) => {
	await recordTracking(page);
	await visit(page, '/');

	await page.getByRole('button', { name: t('site.search.toggle.label') }).click();
	await page.keyboard.press('Escape');
	await navigateClientSide(page, paths.postsIndex);

	await searchFor(page, site.postTitle);
	await page.keyboard.press('Escape');

	await expect
		.poll(() => getTracked(page, 'search-query'))
		.toEqual([
			{
				data: { clicked: false, query: site.postTitle, results: expect.any(Number) },
				name: 'search-query',
			},
		]);
	expect(await getTracked(page, 'search-empty')).toEqual([]);
});

test('search analytics mark a result click', async ({ page, site }) => {
	await recordTracking(page);
	await visit(page, '/');
	await searchFor(page, site.postTitle);

	// Navigating away would discard the tracked events before they are read
	await page.evaluate(() => {
		window.addEventListener(
			'click',
			(event) => {
				event.preventDefault();
			},
			{ capture: true },
		);
	});
	await page.locator('.pf-result-link').first().click();

	await expect
		.poll(() => getTracked(page, 'search-query'))
		.toEqual([
			{
				data: { clicked: true, query: site.postTitle, results: expect.any(Number) },
				name: 'search-query',
			},
		]);
});

test('search analytics flag a search with no results', async ({ page }) => {
	const query = 'qqqqqqqq';

	await recordTracking(page);
	await visit(page, '/');
	await searchFor(page, query);
	await page.keyboard.press('Escape');

	await expect
		.poll(() => getTracked(page, 'search-empty'))
		.toEqual([{ data: { query }, name: 'search-empty' }]);
	expect(await getTracked(page, 'search-query')).toEqual([
		{ data: { clicked: false, query, results: 0 }, name: 'search-query' },
	]);
});
