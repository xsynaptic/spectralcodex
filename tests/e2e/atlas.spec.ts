import type { APIRequestContext, Locator, Page } from '@playwright/test';

import { mapFeatureOpenEventName } from '@spectralcodex/react-map-component/constants';

import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const atlasPath = '/atlas/';
const probeLimit = 8;
const viewport = { height: 844, width: 390 };

// The map reads what is under the pointer a frame or more after it moves
const cursorSettleMs = 80;

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

async function getRegionLocation(request: APIRequestContext) {
	const response = await request.get(paths.regionDetail);
	const page = await response.text();
	const html = page.slice(page.indexOf('<main'));
	const urls = [...html.matchAll(/href="(\/[^/"]+\/)"/g)].map(([, url = '']) => url);

	return getLocationLink(request, [...new Set(urls)]);
}

async function getPageLocationLink(page: Page, request: APIRequestContext) {
	const urls = await page
		.locator('main a[href]')
		.evaluateAll((anchors) =>
			anchors
				.map((anchor) => anchor.getAttribute('href') ?? '')
				.filter((href) => /^\/[^/]+\/$/.test(href)),
		);

	return getLocationLink(request, [...new Set(urls)]);
}

async function openFromMap(page: Page, url: string) {
	await page.evaluate(
		([eventName, detailUrl]) => {
			document.dispatchEvent(new CustomEvent(eventName, { detail: { url: detailUrl } }));
		},
		[mapFeatureOpenEventName, url] as const,
	);
	await page.waitForURL(`**${url}`);
}

// The in-body map is a client:visible island; its controls only exist once it scrolls into view
async function enterAtlas(page: Page) {
	const inlineMap = page.locator('.atlas-inline-map');

	await inlineMap.scrollIntoViewIfNeeded();
	await inlineMap.locator('.maplibregl-ctrl-enter').click();
}

async function dragHandle(page: Page, handle: Locator, distance: number) {
	const box = await handle.boundingBox();

	if (!box) throw new Error('The sheet handle has no box to drag');

	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;

	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + distance, { steps: 8 });
	await page.mouse.up();
}

// Clear of the map's controls, nearest the centre first: the map centres on the Location it last showed
function getTapPositions({ height, width }: { height: number; width: number }) {
	const step = 26;
	const positions: Array<{ x: number; y: number }> = [];

	for (let x = 60; x <= width - 60; x += step) {
		for (let y = 150; y <= height - 80; y += step) positions.push({ x, y });
	}

	return positions.toSorted(
		(a, b) =>
			Math.hypot(a.x - width / 2, a.y - height / 2) - Math.hypot(b.x - width / 2, b.y - height / 2),
	);
}

// A pointer cursor is a Point or a cluster; a cluster zooms where a Point opens its page
async function tapPoint(page: Page, canvas: Locator) {
	const root = page.locator('html[data-atlas-page="pane"]:not([data-atlas-sheet])');

	// The address changes before the swap, so the page being left can still be in the document
	await expect(root).toHaveCount(0);

	for (const { x, y } of getTapPositions(viewport)) {
		// A slow tap can land after its wait ran out
		if ((await root.count()) > 0) return;

		await page.mouse.move(x, y);
		await page.waitForTimeout(cursorSettleMs);

		const cursor = await canvas.evaluate((element) => getComputedStyle(element).cursor);

		if (cursor !== 'pointer') continue;

		await page.mouse.click(x, y);

		try {
			await root.waitFor({ timeout: 1500 });
			return;
		} catch {
			// A cluster; the next position is read against the zoomed map
		}
	}

	throw new Error('No Point on the map took a tap');
}

async function openSheetFromMap(page: Page, url: string) {
	await visit(page, atlasPath);
	await expect(page.locator('.atlas-shell canvas.maplibregl-canvas')).toBeVisible({
		timeout: 10_000,
	});
	await openFromMap(page, url);
}

async function lowerSheet(page: Page, handle: Locator) {
	const root = page.locator('html');

	await expect(async () => {
		if ((await root.getAttribute('data-atlas-sheet')) !== 'down') await handle.click();

		await expect(root).toHaveAttribute('data-atlas-sheet', 'down', { timeout: 1000 });
	}).toPass();
}

async function openSettledSheet(page: Page, url: string) {
	const handle = page.locator('atlas-sheet-handle button');

	await openSheetFromMap(page, url);
	await lowerSheet(page, handle);
	await handle.press('Enter');
	await expect(page.locator('html')).not.toHaveAttribute('data-atlas-sheet');
}

async function getScrollY(page: Page) {
	return page.evaluate(() => window.scrollY);
}

// A rebuilt map would get a new canvas without this flag
async function keepCanvas(canvas: Locator) {
	await canvas.evaluate((element) => {
		Object.assign(element, { isKept: true });
	});
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

	await enterAtlas(page);
	await expect(canvas).toBeVisible({ timeout: 10_000 });

	await keepCanvas(canvas);

	const paneUrl = await getPageLocationLink(page, request);

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

async function openScopedLocation(page: Page, request: APIRequestContext, path: string) {
	await visit(page, path);

	const shell = page.locator('.atlas-shell');
	const scopeBar = shell.locator('.map-scope-bar');
	const scopeName = shell.locator('.map-scope-name');
	const scopeToggle = shell.locator('.map-scope-toggle');
	const metrics = shell.locator('.maplibregl-ctrl-metrics');
	const heading = await page.locator('h1').textContent();
	const title = heading?.trim() ?? '';

	await enterAtlas(page);
	await expect(scopeName).toHaveText(title, { timeout: 10_000 });

	const scopedMetrics = (await metrics.textContent()) ?? '';

	const paneUrl = await getPageLocationLink(page, request);

	await page.locator(`main a[href="${paneUrl}"]`).first().click();
	await page.waitForURL(`**${paneUrl}`);

	await expect(scopeName).toHaveText(title);
	await expect(metrics).toHaveText(scopedMetrics);
	await expect(shell.locator('.map-pulse-ring').first()).toBeVisible();

	return { metrics, paneUrl, scopeBar, scopedMetrics, scopeName, scopeToggle, title };
}

test('a Post scopes the map until the reader turns it off', async ({ page, request }) => {
	const { metrics, scopeBar, scopedMetrics, scopeToggle } = await openScopedLocation(
		page,
		request,
		paths.postDetail,
	);

	await scopeToggle.click();

	await expect(scopeBar).not.toHaveAttribute('data-active');
	await expect(metrics).not.toHaveText(scopedMetrics);

	await scopeToggle.click();

	await expect(metrics).toHaveText(scopedMetrics);
});

test('a Theme scopes the map, and its Scope turned off comes back from its name and from a later visit', async ({
	page,
	request,
}) => {
	const { metrics, paneUrl, scopeBar, scopedMetrics, scopeName, scopeToggle, title } =
		await openScopedLocation(page, request, paths.themeDetail);

	await scopeToggle.click();

	await expect(scopeBar).not.toHaveAttribute('data-active');
	await expect(metrics).not.toHaveText(scopedMetrics);

	await scopeName.click();
	await page.waitForURL(`**${paths.themeDetail}`);

	await expect(scopeBar).toHaveAttribute('data-active');
	await expect(metrics).toHaveText(scopedMetrics);

	await scopeToggle.click();
	await page.goBack();
	await page.waitForURL(`**${paneUrl}`);

	await expect(page.locator('h1')).not.toHaveText(title);
	await expect(scopeBar).not.toHaveAttribute('data-active');

	await page.goForward();
	await page.waitForURL(`**${paths.themeDetail}`);

	// A history move counts as a new visit to the page, so its Scope is on again
	await expect(scopeBar).toHaveAttribute('data-active');
});

test.describe('on a wide viewport', () => {
	test.use({ viewport: { height: 900, width: 1440 } });

	test('the split survives a reload at the width the reader set', async ({ page }) => {
		await visit(page, paths.regionDetail);

		const root = page.locator('html');
		const separator = page.getByRole('separator', { name: t('atlas.divider.label') });

		await enterAtlas(page);
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

	test("a click on the open Location's own Point is spent on its popup", async ({
		page,
		request,
	}) => {
		const locationUrl = await getRegionLocation(request);
		const shell = page.locator('.atlas-shell');

		await visit(page, atlasPath);
		await expect(shell.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10_000 });
		await openFromMap(page, locationUrl);

		const box = await shell.locator('.maplibregl-marker').first().boundingBox();

		if (!box) throw new Error('The Target has no marker to click');

		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		await expect(shell.locator('.maplibregl-popup .map-popup-title')).toBeVisible();

		await page.evaluate((eventName) => {
			const opened = { count: 0 };

			document.addEventListener(eventName, () => {
				opened.count += 1;
			});
			Object.assign(globalThis, { opened });
		}, mapFeatureOpenEventName);

		await page.locator(`.main-pane a[href="${paths.locationsIndex}"]`).first().click();
		await page.waitForURL(`**${paths.locationsIndex}`);
		await expect(shell).toBeHidden();
		await page.waitForTimeout(500);

		expect(
			await page.evaluate(() => (globalThis as { opened?: { count: number } }).opened?.count),
		).toBe(0);
		expect(new URL(page.url()).pathname).toBe(paths.locationsIndex);
	});
});

test.describe('a sheet on a phone viewport', () => {
	test.use({ viewport });

	test('a lowered sheet keeps its page, and a Point tap opens the next one raised', async ({
		page,
	}) => {
		test.slow();

		const root = page.locator('html');
		const shell = page.locator('.atlas-shell');
		const canvas = shell.locator('canvas.maplibregl-canvas');
		const handle = page.locator('atlas-sheet-handle button');

		await openSheetFromMap(page, paths.regionDetail);
		await keepCanvas(canvas);

		const historyLength = await page.evaluate(() => history.length);

		for (let bounce = 0; bounce < 3; bounce += 1) {
			await lowerSheet(page, handle);
			await handle.press('Enter');
			await expect(root).not.toHaveAttribute('data-atlas-sheet');
		}

		await handle.click();

		await expect(handle).toHaveAccessibleName(t('atlas.sheet.open.label'));
		await expect(handle).toHaveAttribute('aria-expanded', 'false');
		await expect(page.locator('h1')).toBeHidden();
		await expect(shell.locator('.maplibregl-ctrl-expand')).toBeHidden();
		expect(new URL(page.url()).pathname).toBe(paths.regionDetail);
		expect(await page.evaluate(() => history.length)).toBe(historyLength);

		await tapPoint(page, canvas);

		await expect(page.locator('.main-pane')).toHaveCSS('translate', 'none');
		await expect(page.locator('.maplibregl-popup')).toHaveCount(0);
		expect(new URL(page.url()).pathname).not.toBe(paths.regionDetail);
		await expectSameCanvas(canvas);
	});

	test(
		'the sheet holds through a short drag and comes back where it was read',
		{ tag: '@firefox' },
		async ({ page, request }) => {
			const locationUrl = await getRegionLocation(request);
			const root = page.locator('html');
			const pane = page.locator('.main-pane');
			const handle = page.locator('atlas-sheet-handle button');

			await openSettledSheet(page, locationUrl);
			await page.evaluate(() => {
				window.scrollTo({ behavior: 'instant', top: 600 });
			});

			await dragHandle(page, handle, viewport.height * 0.15);

			await expect(pane).toHaveCSS('translate', 'none');
			await expect(root).not.toHaveAttribute('data-atlas-sheet');

			await dragHandle(page, handle, viewport.height * 0.3);

			await expect(root).toHaveAttribute('data-atlas-sheet', 'down');

			const scrollY = await getScrollY(page);
			const box = await handle.boundingBox();

			expect(scrollY).toBeGreaterThan(0);
			expect((box?.y ?? 0) + (box?.height ?? 0)).toBe(viewport.height);

			await page.mouse.wheel(0, 400);
			await dragHandle(page, handle, viewport.height * -0.15);

			await expect(root).toHaveAttribute('data-atlas-sheet', 'down');
			await expect(pane).not.toHaveAttribute('data-grabbing');
			expect(await getScrollY(page)).toBe(scrollY);

			await dragHandle(page, handle, viewport.height * -0.3);

			await expect(root).not.toHaveAttribute('data-atlas-sheet');
			await expect(pane).toHaveCSS('translate', 'none');
			expect(await getScrollY(page)).toBe(scrollY);
			expect(new URL(page.url()).pathname).toBe(locationUrl);
		},
	);

	test('a slide still running when the split takes over leaves no sheet behind', async ({
		page,
		request,
	}) => {
		const locationUrl = await getRegionLocation(request);
		const root = page.locator('html');
		const pane = page.locator('.main-pane');
		const handle = page.locator('atlas-sheet-handle button');

		await openSettledSheet(page, locationUrl);
		await handle.press('Enter');

		const slowedCount = await pane.evaluate((element) => {
			const moves = element.getAnimations();

			for (const move of moves) move.playbackRate = 0.05;

			return moves.length;
		});

		expect(slowedCount).toBe(1);

		await page.setViewportSize({ height: 800, width: 1280 });

		await expect.poll(() => pane.evaluate((element) => element.getAnimations().length)).toBe(0);
		await expect(root).not.toHaveAttribute('data-atlas-sheet');
		await expect(pane).not.toHaveAttribute('data-grabbing');
		expect(await pane.evaluate((element) => element.style.translate)).toBe('');
		expect(await root.evaluate((element) => element.style.cssText)).not.toContain('sheet-fold');
	});
});

test.describe('a sheet and its map on a phone viewport', () => {
	test.use({ viewport });

	test('the page itself follows a pull up', async ({ page, request }) => {
		const locationUrl = await getRegionLocation(request);
		const root = page.locator('html');
		const main = page.locator('main');
		const handle = page.locator('atlas-sheet-handle button');

		await openSheetFromMap(page, locationUrl);
		await lowerSheet(page, handle);

		await expect(main).toBeHidden();

		const x = viewport.width / 2;

		await page.mouse.move(x, viewport.height - 12);
		await page.mouse.down();
		await page.mouse.move(x, viewport.height / 2, { steps: 8 });

		await expect(main).toBeInViewport();
		expect(new URL(page.url()).pathname).toBe(locationUrl);

		await page.mouse.up();

		await expect(root).not.toHaveAttribute('data-atlas-sheet');
	});

	test('the back button returns from a sheet to the map', async ({ page, request }) => {
		const locationUrl = await getRegionLocation(request);
		const canvas = page.locator('.atlas-shell canvas.maplibregl-canvas');

		await openSheetFromMap(page, locationUrl);
		await keepCanvas(canvas);

		await expect(page.locator('html')).toHaveAttribute('data-atlas-page', 'pane');

		await page.goBack();
		await page.waitForURL(`**${atlasPath}`);

		await expect(canvas).toBeVisible();
		await expectSameCanvas(canvas);
	});

	test('the X on the map leaves a regular page in place', async ({ page, request }) => {
		const locationUrl = await getRegionLocation(request);
		const root = page.locator('html');
		const shell = page.locator('.atlas-shell');
		const handle = page.locator('atlas-sheet-handle button');

		await openSheetFromMap(page, locationUrl);
		await lowerSheet(page, handle);

		await shell.locator('.maplibregl-ctrl-exit').click();

		await expect(root).not.toHaveAttribute('data-atlas');
		await expect(root).not.toHaveAttribute('data-atlas-sheet');
		await expect(shell).toBeHidden();
		await expect(handle).toBeHidden();
		await expect(page.locator('h1')).toBeVisible();
		expect(new URL(page.url()).pathname).toBe(locationUrl);
	});

	test('a Region sheet sets the Scope, and the bar raises the sheet and turns it off', async ({
		page,
	}) => {
		const root = page.locator('html');
		const shell = page.locator('.atlas-shell');
		const scopeName = shell.locator('.map-scope-name');
		const metrics = shell.locator('.maplibregl-ctrl-metrics');
		const handle = page.locator('atlas-sheet-handle button');

		await visit(page, atlasPath);
		await expect(metrics).toBeVisible({ timeout: 10_000 });

		const fullMetrics = (await metrics.textContent()) ?? '';

		await openFromMap(page, paths.regionDetail);

		const heading = await page.locator('h1').textContent();
		const title = heading?.trim() ?? '';

		await lowerSheet(page, handle);

		await expect(scopeName).toHaveText(title);
		await expect(metrics).not.toHaveText(fullMetrics);

		await scopeName.click();

		await expect(root).not.toHaveAttribute('data-atlas-sheet');
		expect(new URL(page.url()).pathname).toBe(paths.regionDetail);

		await handle.click();
		await expect(root).toHaveAttribute('data-atlas-sheet', 'down');

		await shell.locator('.map-scope-toggle').click();

		await expect(shell.locator('.map-scope-bar')).not.toHaveAttribute('data-active');
		await expect(metrics).toHaveText(fullMetrics);
	});

	test('the globe on a page lowers it in place over the map', async ({ page }) => {
		const root = page.locator('html');
		const canvas = page.locator('.atlas-shell canvas.maplibregl-canvas');
		const handle = page.locator('atlas-sheet-handle button');

		const inlineMap = page.locator('.atlas-inline-map');

		await visit(page, paths.regionDetail);
		await inlineMap.scrollIntoViewIfNeeded();

		const inlineMapBox = await inlineMap.boundingBox();

		await enterAtlas(page);

		await expect(root).toHaveAttribute('data-atlas-sheet', 'down');
		await expect(root).toHaveAttribute('data-atlas');
		await expect(canvas).toBeVisible({ timeout: 10_000 });
		expect(new URL(page.url()).pathname).toBe(paths.regionDetail);

		const scrollY = await getScrollY(page);

		await handle.click();

		await expect(root).not.toHaveAttribute('data-atlas-sheet');
		await expect(page.locator('.main-pane')).toHaveCSS('translate', 'none');
		expect(await getScrollY(page)).toBe(scrollY);
		expect(await inlineMap.boundingBox()).toEqual(inlineMapBox);
	});
});
