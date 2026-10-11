import type { APIRequestContext, Locator } from '@playwright/test';

import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const atlasPath = '/atlas/';
const probeLimit = 8;

// Region pages also link to Posts, which have no split
async function getPaneLink(request: APIRequestContext, urls: Array<string>) {
	for (const url of urls.slice(0, probeLimit)) {
		const response = await request.get(url);
		const html = await response.text();

		if (html.includes('data-atlas-page="pane"')) return url;
	}

	throw new Error(`No atlas page among the first ${String(probeLimit)} links on the Region`);
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
	const paneUrl = await getPaneLink(request, [...new Set(urls)]);

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
