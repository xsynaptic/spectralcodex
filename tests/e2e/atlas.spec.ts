import {
	defaultMapMessages,
	mapActiveAttribute,
	mapControlClassName,
} from '@spectralcodex/react-map-component/constants';

import {
	atlasPath,
	enterAtlas,
	expectHistoryArrival,
	expectSameCanvas,
	expectScopeHeld,
	expectShellGone,
	getAtlas,
	getHeading,
	getPreviewLink,
	keepCanvas,
	mapLoadTimeout,
	openInPane,
	toggleScope,
	wideViewport,
} from '#e2e/atlas.ts';
import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { atlasFlagAttribute } from '#lib/atlas/atlas-constants.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

test('the atlas loads from a direct visit', { tag: '@smoke' }, async ({ page }) => {
	await visit(page, atlasPath);

	await expect(getAtlas(page).metrics).toBeVisible({ timeout: mapLoadTimeout });
});

test.describe('on a wide viewport', () => {
	test.use({ viewport: wideViewport });

	test(
		'one map carries a reader through the split, the full-screen atlas and back out',
		{ tag: '@smoke' },
		async ({ page }) => {
			const { canvas, close, root, shell } = getAtlas(page);
			const atlasStylesheet = shell.locator('link[rel="stylesheet"]');

			await visit(page, paths.regionDetail);
			await expect(atlasStylesheet).toHaveCount(0);

			await enterAtlas(page);
			await expect(atlasStylesheet).toHaveCount(1);
			await expect(shell).toBeFocused();
			await keepCanvas(canvas);

			const paneTitle = await openInPane(page, getPreviewLink(page));

			await expectSameCanvas(canvas);

			await shell.getByRole('button', { name: t('atlas.expand.label') }).click();
			await page.waitForURL(`**${atlasPath}`);
			await expectSameCanvas(canvas);

			await close.click();
			await expectHistoryArrival(page, paneTitle);

			await expect(root).not.toHaveAttribute(atlasFlagAttribute);
			await expectShellGone(shell);
		},
	);

	test('the split survives a reload at the width the reader set', async ({ page }) => {
		const separator = page.getByRole('separator', { name: t('atlas.divider.label') });

		await visit(page, paths.regionDetail);
		await enterAtlas(page);

		const openedWidth = (await separator.getAttribute('aria-valuenow')) ?? '';

		await separator.press('ArrowLeft');
		await separator.press('ArrowLeft');
		await expect(separator).not.toHaveAttribute('aria-valuenow', openedWidth);

		const chosenWidth = (await separator.getAttribute('aria-valuenow')) ?? '';

		await page.reload({ waitUntil: 'domcontentloaded' });

		await expect(page.locator('html')).toHaveAttribute(atlasFlagAttribute);
		await expect(separator).toHaveAttribute('aria-valuenow', chosenWidth);
	});

	test("another of the open Location's Points opens its own popup, with no link to the page it is on", async ({
		page,
	}) => {
		const { shell } = getAtlas(page);
		const markers = shell.locator('.maplibregl-marker');
		const popupTitle = shell.locator(`.maplibregl-popup .${mapControlClassName.popupTitle}`);

		await visit(page, paths.locationMultiPoint);
		await enterAtlas(page);
		await expect(markers.nth(1)).toBeVisible();

		await markers.nth(1).click();

		await expect(popupTitle).toBeVisible();
		await expect(popupTitle.locator('a')).toHaveCount(0);
		expect(new URL(page.url()).pathname).toBe(paths.locationMultiPoint);
	});

	test('one overlay at a time: search closes a popup, and a press on the empty map closes the filter menu', async ({
		page,
	}) => {
		const { canvas, popup, searchInput, searchOpener, shell } = getAtlas(page);
		const markers = shell.locator('.maplibregl-marker');
		const filterButton = page.getByRole('button', {
			name: defaultMapMessages.filterMenuAriaLabel,
		});

		await visit(page, paths.locationMultiPoint);
		await enterAtlas(page);
		await markers.nth(1).click();
		await expect(popup).toBeVisible();

		await searchOpener.click();

		await expect(searchInput).toBeFocused();
		await expect(popup).toHaveCount(0);

		await filterButton.click();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'true');

		await canvas.click();

		await expect(filterButton).toHaveAttribute('aria-expanded', 'false');
		await expect(popup).toHaveCount(0);
		expect(new URL(page.url()).pathname).toBe(paths.locationMultiPoint);
	});

	test('a filter the reader set holds as the pane moves to another page', async ({ page }) => {
		const { metrics, shell } = getAtlas(page);
		const filterButton = shell.locator(`.${mapControlClassName.filter}`);
		const topRating = shell.locator(`.${mapControlClassName.filterRating} button`).last();

		await visit(page, paths.regionDetail);

		const regionTitle = await getHeading(page);

		await enterAtlas(page);
		await expect(metrics).toBeVisible();

		const unfilteredMetrics = (await metrics.textContent()) ?? '';

		await filterButton.click();
		await topRating.click();
		await expect(topRating).toHaveAttribute('aria-pressed', 'true');
		await expect(metrics).not.toHaveText(unfilteredMetrics);

		const filteredMetrics = (await metrics.textContent()) ?? '';

		await page.keyboard.press('Escape');
		await openInPane(page, getPreviewLink(page));
		await page.goBack();
		await expectHistoryArrival(page, regionTitle);

		await expect(metrics).toHaveText(filteredMetrics);
		await filterButton.click();
		await expect(topRating).toHaveAttribute('aria-pressed', 'true');
	});
});

test.describe('a Scope on a wide viewport', () => {
	test.use({ viewport: wideViewport });

	test('a Post scopes the map, and a Location it links to keeps the Scope', async ({ page }) => {
		await visit(page, paths.postDetail);

		const title = await getHeading(page);

		await enterAtlas(page);

		const scopedMetrics = await expectScopeHeld(page, title);

		await openInPane(page, page.locator(`main a[href="${paths.postLocation}"]`).first());

		await expect(getAtlas(page).marker).toBeVisible();
		await expect(getAtlas(page).metrics).toHaveText(scopedMetrics);
		await expectScopeHeld(page, title);
		await toggleScope(page, scopedMetrics);
	});

	test('a Theme Scope turned off comes back from its name and from a later visit', async ({
		page,
	}) => {
		const { metrics, scopeBar, scopeName, scopeToggle } = getAtlas(page);

		await visit(page, paths.themeDetail);

		const title = await getHeading(page);

		await enterAtlas(page);

		const scopedMetrics = await expectScopeHeld(page, title);

		const paneTitle = await openInPane(page, getPreviewLink(page));

		await expectScopeHeld(page, title);

		await scopeToggle.click();
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await scopeName.click();
		await page.waitForURL(`**${paths.themeDetail}`);
		await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
		await expect(metrics).toHaveText(scopedMetrics);

		await scopeToggle.click();
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await page.goBack();
		await expectHistoryArrival(page, paneTitle);
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await page.goForward();
		await expectHistoryArrival(page, title);
		await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
	});

	test('a Series scopes the map, and a Location in it keeps the Scope', async ({ page }) => {
		await visit(page, paths.seriesDetail);

		const title = await getHeading(page);

		await enterAtlas(page);

		const scopedMetrics = await expectScopeHeld(page, title);

		await openInPane(page, getPreviewLink(page));

		await expect(getAtlas(page).marker).toBeVisible();
		await expect(getAtlas(page).metrics).toHaveText(scopedMetrics);
		await expectScopeHeld(page, title);
		await toggleScope(page, scopedMetrics);
	});
});
