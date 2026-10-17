import type { APIRequestContext, Page } from '@playwright/test';

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

// Resolves on the next astro:page-load, so a full page load fails it by destroying the context
async function navigateClientSide(page: Page, path: string) {
	await page.evaluate(
		(href) =>
			new Promise<void>((resolve) => {
				document.addEventListener(
					'astro:page-load',
					() => {
						resolve();
					},
					{ once: true },
				);

				const link = document.createElement('a');

				link.href = href;
				document.body.append(link);
				link.click();
			}),
		path,
	);
}

test('search still works after client-side navigation', async ({ page, site }) => {
	await visit(page, '/');

	const toggle = page.getByRole('button', { name: t('site.search.toggle.label') });
	const searchInput = page.locator('pagefind-input input');

	// Opening once loads Pagefind, so each later page's components register with it
	await toggle.click();
	await expect(searchInput).toBeFocused();
	await page.keyboard.press('Escape');

	for (const path of [paths.postsIndex, paths.regionDetail, '/']) {
		await navigateClientSide(page, path);
	}

	await toggle.click();
	await expect(searchInput).toBeFocused();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await searchInput.pressSequentially(site.postTitle, { delay: 30 });

	const resultLink = page.locator('.pf-result-link').first();

	await expect(resultLink).toBeVisible({ timeout: 10_000 });
	await expect(resultLink).toHaveAttribute('href', site.postDetail);

	// A stale trigger from an earlier page would take the focus on close
	await page.keyboard.press('Escape');
	await expect(toggle).toBeFocused();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

interface TrackedEvent {
	data: unknown;
	name: string;
}

async function recordTracking(page: Page) {
	await page.addInitScript(() => {
		const tracked: Array<TrackedEvent> = [];

		Object.assign(window, {
			tracked,
			umami: {
				track: (name: string, data: unknown) => {
					tracked.push({ data, name });
				},
			},
		});
	});
}

function getTracked(page: Page, name: string) {
	return page.evaluate(
		(eventName) =>
			((window as { tracked?: Array<TrackedEvent> }).tracked ?? []).filter(
				(event) => event.name === eventName,
			),
		name,
	);
}

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
	// Pagefind matches Latin gibberish fuzzily; this letter appears in no content
	const query = 'ꙮꙮꙮ';

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
