import type { APIRequestContext, Locator } from '@playwright/test';

import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const atlasPath = '/atlas/';
const probeLimit = 8;

// A page may also link to Posts, which set a Scope of their own or have no split
async function getLocationLink(request: APIRequestContext, urls: Array<string>) {
	for (const url of urls.slice(0, probeLimit)) {
		const response = await request.get(url);
		const html = await response.text();

		if (html.includes('data-map-view="{&quot;targetIds')) return url;
	}

	throw new Error(
		`No Location in the atlas among the first ${String(probeLimit)} links on the page`,
	);
}

async function expectSameCanvas(canvas: Locator) {
	expect(await canvas.evaluate((element) => 'isKept' in element)).toBe(true);
}

test('the atlas loads from a direct visit', { tag: '@smoke' }, async ({ page }) => {
	await visit(page, atlasPath);

	await expect(page.locator('.atlas-shell canvas.maplibregl-canvas')).toBeVisible({
		timeout: 10_000,
	});
});

test('one map carries a reader through the split, the full-screen atlas and back out', async ({
	page,
	request,
}) => {
	await visit(page, paths.regionDetail);

	const root = page.locator('html');
	const shell = page.locator('.atlas-shell');
	const canvas = shell.locator('canvas.maplibregl-canvas');

	await page.locator('.atlas-inline-map .maplibregl-ctrl-enter').click();
	await expect(canvas).toBeVisible({ timeout: 10_000 });

	// A rebuilt map would get a new canvas without this flag
	await canvas.evaluate((element) => {
		Object.assign(element, { isKept: true });
	});

	const urls = await page
		.locator('main a[href]')
		.evaluateAll((anchors) =>
			anchors
				.map((anchor) => anchor.getAttribute('href') ?? '')
				.filter((href) => /^\/[^/]+\/$/.test(href)),
		);
	const paneUrl = await getLocationLink(request, [...new Set(urls)]);

	await page.locator(`main a[href="${paneUrl}"]`).first().click();
	await page.waitForURL(`**${paneUrl}`);

	await expect(root).toHaveAttribute('data-atlas-page', 'pane');
	await expect(canvas).toBeVisible();
	await expectSameCanvas(canvas);

	await shell.locator('.maplibregl-ctrl-expand').click();
	await page.waitForURL(`**${atlasPath}`);

	await expect(canvas).toBeVisible();
	await expectSameCanvas(canvas);

	await shell.locator('.maplibregl-ctrl-exit').click();
	await page.waitForURL(`**${paneUrl}`);

	await expect(root).not.toHaveAttribute('data-atlas');
	await expect(shell).toBeHidden();
});

const scopePages = [
	['Theme', paths.themeDetail],
	['Series', paths.seriesDetail],
	['Post', paths.postDetail],
] as const;

for (const [label, path] of scopePages) {
	test(`a ${label} scopes the map until the reader clears it`, async ({ page, request }) => {
		await visit(page, path);

		const shell = page.locator('.atlas-shell');
		const scopeName = shell.locator('.map-scope-name');
		const metrics = shell.locator('.maplibregl-ctrl-metrics');
		const heading = await page.locator('h1').textContent();
		const title = heading?.trim() ?? '';

		await page.locator('.atlas-inline-map .maplibregl-ctrl-enter').click();
		await expect(scopeName).toHaveText(title, { timeout: 10_000 });

		const scopedMetrics = (await metrics.textContent()) ?? '';

		const urls = await page
			.locator('main a[href]')
			.evaluateAll((anchors) =>
				anchors
					.map((anchor) => anchor.getAttribute('href') ?? '')
					.filter((href) => /^\/[^/]+\/$/.test(href)),
			);
		const paneUrl = await getLocationLink(request, [...new Set(urls)]);

		await page.locator(`main a[href="${paneUrl}"]`).first().click();
		await page.waitForURL(`**${paneUrl}`);

		await expect(scopeName).toHaveText(title);
		await expect(metrics).toHaveText(scopedMetrics);
		await expect(shell.locator('.map-pulse-ring').first()).toBeVisible();

		await shell.locator('.map-scope-clear').click();

		await expect(scopeName).toBeHidden();
		await expect(metrics).not.toHaveText(scopedMetrics);

		await page.goBack();
		await page.waitForURL(`**${path}`);

		// Going back counts as a new visit to the page, so its Scope is set again
		await expect(scopeName).toHaveText(title);
	});
}

test.describe('on a wide viewport', () => {
	test.use({ viewport: { height: 900, width: 1440 } });

	test('the split survives a reload at the width the reader set', async ({ page }) => {
		await visit(page, paths.regionDetail);

		const root = page.locator('html');
		const separator = page.getByRole('separator', { name: t('atlas.divider.label') });

		await page.locator('.atlas-inline-map .maplibregl-ctrl-enter').click();
		await expect(separator).toBeVisible();

		const openedWidth = await separator.getAttribute('aria-valuenow');

		await separator.press('ArrowLeft');
		await separator.press('ArrowLeft');
		await expect(separator).not.toHaveAttribute('aria-valuenow', openedWidth ?? '');

		const chosenWidth = (await separator.getAttribute('aria-valuenow')) ?? '';

		await page.reload({ waitUntil: 'domcontentloaded' });

		await expect(root).toHaveAttribute('data-atlas');
		await expect(separator).toHaveAttribute('aria-valuenow', chosenWidth);
	});
});
