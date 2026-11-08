import type { Page } from '@playwright/test';

import {
	mapActiveAttribute,
	mapControlClassName,
} from '@spectralcodex/react-map-component/constants';

import {
	expectHistoryArrival,
	getAtlas,
	getHeading,
	getPreviewLink,
	openInPane,
	wideViewport,
} from '#e2e/atlas.ts';
import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { readWitnessPath } from '#e2e/witness.ts';
import { atlasPaneMainSelector, atlasShellSelector } from '#lib/atlas/atlas-constants.ts';

const witnessFile = 'verify/models/map-scope/witness.tla';
const directoryPattern = /map-directory/;
const insertedLinkId = 'map-scope-witness-link';

// Holds the one directory request until the path says it lands
async function holdDirectory(page: Page) {
	const { promise, resolve } = Promise.withResolvers<boolean>();

	await page.route(directoryPattern, async (route) => {
		await promise;
		await route.continue();
	});

	return () => {
		resolve(true);
	};
}

async function readObserved(page: Page) {
	const observed = await page.evaluate(
		({ activeAttribute, metrics, scopeBar, scopeName, scopeToggle, shell }) => ({
			active: document.querySelector(`${shell} .${scopeBar}`)?.hasAttribute(activeAttribute),
			heading: document.querySelector('h1')?.textContent,
			marker: document.querySelector(`${shell} .maplibregl-marker`) !== null,
			metrics: document.querySelector(`${shell} .${metrics}`)?.textContent,
			pending: document.querySelector(`${shell} .${scopeToggle}`)?.hasAttribute('disabled'),
			scope: document.querySelector(`${shell} .${scopeName}`)?.textContent,
		}),
		{
			activeAttribute: mapActiveAttribute,
			metrics: mapControlClassName.metrics,
			scopeBar: mapControlClassName.scopeBar,
			scopeName: mapControlClassName.scopeName,
			scopeToggle: mapControlClassName.scopeToggle,
			shell: atlasShellSelector,
		},
	);

	return {
		active: observed.active === true,
		loaded: (observed.metrics ?? '').trim() !== '',
		marker: observed.marker,
		page: (observed.heading ?? '').trim(),
		pending: observed.pending === true,
		scope: (observed.scope ?? '').trim(),
	};
}

// The Theme, the Region and the outside Location have no link from the page before them, so one is added to the pane
async function followLinkTo(page: Page, path: string) {
	await page.locator(atlasPaneMainSelector).evaluate(
		(main, { href, id }) => {
			const link = document.createElement('a');

			link.href = href;
			link.id = id;
			link.textContent = href;
			link.style.cssText = 'position: fixed; inset: 50% auto auto 50%; z-index: 2147483647';
			main.prepend(link);
		},
		{ href: path, id: insertedLinkId },
	);

	return openInPane(page, page.locator(`#${insertedLinkId}`));
}

// The Scope bar shows a switch before the canvas's deferred render applies it
async function switchTheScope(page: Page) {
	const { metrics, scopeToggle } = getAtlas(page);
	const scopedMetrics = (await metrics.textContent()) ?? '';

	await scopeToggle.click();
	await expect(metrics).not.toHaveText(scopedMetrics);
}

test.describe('the map Scope model on a wide viewport', () => {
	test.use({ viewport: wideViewport });

	test('the witness path replays in the browser with the same observables', async ({ page }) => {
		const witnessPath = readWitnessPath(witnessFile);
		const headings = new Map<string, string>();
		const releaseDirectory = await holdDirectory(page);

		const acts: Array<{ act: () => unknown; step: string }> = [
			{
				act: async () => {
					await visit(page, `${paths.regionDetail}?atlas`);
					headings.set('tainan', await getHeading(page));
				},
				step: 'Init',
			},
			{
				act: async () => {
					headings.set('temple', await openInPane(page, getPreviewLink(page)));
				},
				step: 'YouFollowALink',
			},
			{ act: releaseDirectory, step: 'TheDirectoryLands' },
			{
				act: async () => {
					headings.set('theme', await followLinkTo(page, paths.themeDetail));
				},
				step: 'YouFollowALink',
			},
			{ act: () => switchTheScope(page), step: 'YouSwitchTheScope' },
			{
				act: async () => {
					await page.goBack();
					await expectHistoryArrival(page, headings.get('temple') ?? '');
				},
				step: 'YouFollowALink',
			},
			{
				act: async () => {
					await page.goForward();
					await expectHistoryArrival(page, headings.get('theme') ?? '');
				},
				step: 'YouFollowALink',
			},
			{ act: () => switchTheScope(page), step: 'YouSwitchTheScope' },
			{ act: () => getAtlas(page).scopeName.click(), step: 'YouOpenFromTheMap' },
			{
				act: async () => {
					await page.goBack();
					await expectHistoryArrival(page, headings.get('temple') ?? '');
				},
				step: 'YouFollowALink',
			},
			{
				act: async () => {
					headings.set('tainan', await followLinkTo(page, paths.regionDetail));
				},
				step: 'YouFollowALink',
			},
			{ act: () => switchTheScope(page), step: 'YouSwitchTheScope' },
			{
				act: async () => {
					headings.set('theater', await followLinkTo(page, paths.locationOutsideScopes));
				},
				step: 'YouFollowALink',
			},
			{ act: () => switchTheScope(page), step: 'YouSwitchTheScope' },
		];

		expect(witnessPath.map(({ step }) => step)).toEqual(acts.map(({ step }) => step));

		for (const [index, { act, step }] of acts.entries()) {
			await act();

			const { seen = {} } = witnessPath[index] ?? {};
			const expected = {
				...seen,
				page: headings.get(String(seen.page)),
				scope: seen.scope === '' ? '' : headings.get(String(seen.scope)),
			};

			await expect.poll(() => readObserved(page), { message: step }).toEqual(expected);
		}
	});
});
