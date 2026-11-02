import {
	defaultMapMessages,
	mapActiveAttribute,
	mapControlClassName,
} from '@spectralcodex/react-map-component/constants';

import {
	expectScopeHeld,
	getAtlas,
	getHeading,
	getSlugQuery,
	lowerSheet,
	phoneViewport,
	searchFor,
	wideViewport,
} from '#e2e/atlas.ts';
import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { atlasSheetAttribute, atlasSheetRest } from '#lib/atlas/atlas-constants.ts';

test.describe('search on a wide viewport', () => {
	test.use({ viewport: wideViewport });

	test('a Location found by name opens in the pane, and focus returns to the prompt', async ({
		page,
	}) => {
		const { searchInput, searchOpener } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, getSlugQuery(paths.postLocation));
		await searchInput.press('Enter');

		await page.waitForURL(`**${paths.postLocation}`);
		await expect(searchInput).toBeHidden();
		await expect(searchOpener).toBeFocused();
	});

	test('the arrow keys and the pointer move through the rows, and Escape closes onto the opener', async ({
		page,
	}) => {
		const { searchInput, searchOpener, searchOptions } = getAtlas(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, 'temple');
		await expect(searchOptions.first()).toHaveAttribute('aria-selected', 'true');

		await searchInput.press('ArrowDown');
		await expect(searchOptions.nth(1)).toHaveAttribute('aria-selected', 'true');
		await expect(searchInput).toHaveAttribute(
			'aria-activedescendant',
			(await searchOptions.nth(1).getAttribute('id')) ?? '',
		);

		await searchInput.press('ArrowUp');
		await searchInput.press('ArrowUp');
		await expect(searchOptions.first()).toHaveAttribute('aria-selected', 'true');

		await searchOptions.nth(2).hover();
		await expect(searchOptions.nth(2)).toHaveAttribute('aria-selected', 'true');

		await searchInput.press('Escape');
		await expect(searchInput).toBeHidden();
		await expect(searchOpener).toBeFocused();
		expect(new URL(page.url()).pathname).toBe(paths.locationSinglePoint);
	});

	test('a Theme picked in search scopes the map, and picking it again turns the Scope back on', async ({
		page,
	}) => {
		const { metrics, scopeBar, scopeToggle, searchInput, searchOpener, searchOptions } =
			getAtlas(page);

		await visit(page, paths.themeDetail);

		const title = await getHeading(page);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, title);
		await expect(searchOptions.first()).toContainText(title);
		await searchOptions.first().click();

		await page.waitForURL(`**${paths.themeDetail}`);

		const scopedMetrics = await expectScopeHeld(page, title);

		await expect(searchOpener).toBeFocused();

		await scopeToggle.click();
		await expect(scopeBar).not.toHaveAttribute(mapActiveAttribute);

		await searchFor(page, title);
		await searchInput.press('Enter');

		await expect(scopeBar).toHaveAttribute(mapActiveAttribute);
		await expect(metrics).toHaveText(scopedMetrics);
		expect(new URL(page.url()).pathname).toBe(paths.themeDetail);
	});

	test('a press outside closes search where focus is, and search and the filter menu take turns', async ({
		page,
	}) => {
		const { searchInput, searchOpener, title } = getAtlas(page);
		const filterButton = page.getByRole('button', {
			name: defaultMapMessages.filterMenuAriaLabel,
		});

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await searchFor(page, 'temple');
		await title.click();

		await expect(searchInput).toBeHidden();
		await expect(searchOpener).not.toBeFocused();

		await searchFor(page, 'temple');
		await filterButton.click();

		await expect(searchInput).toBeHidden();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'true');

		await searchOpener.click();

		await expect(searchInput).toBeFocused();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'false');
	});
});

test.describe('search on a phone viewport', { tag: '@engines' }, () => {
	test.use({ viewport: phoneViewport });

	test('a search pick from a lowered sheet opens its page at half, where the filter menu stays on the map within reach', async ({
		page,
	}) => {
		const { marker, root, searchInput, shell } = getAtlas(page);
		const filterButton = shell.locator(`.${mapControlClassName.filter}`);

		await visit(page, `${paths.locationSinglePoint}?atlas`);
		await lowerSheet(page);
		await searchFor(page, getSlugQuery(paths.postLocation));
		await searchInput.press('Enter');

		await page.waitForURL(`**${paths.postLocation}`);
		await expect(root).toHaveAttribute(atlasSheetAttribute, atlasSheetRest.half);

		await filterButton.click();
		await expect(marker).toBeVisible();
		await expect(filterButton).toHaveAttribute('aria-expanded', 'true');

		const menu = page.locator(`[id="${(await filterButton.getAttribute('aria-controls')) ?? ''}"]`);
		const lastChoice = menu.getByRole('listitem').last().getByRole('button').last();

		await expect(menu).toBeInViewport();

		await lastChoice.click();
		await expect(lastChoice).toHaveAttribute('aria-pressed', 'true');
	});
});
