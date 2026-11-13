import type { Page } from '@playwright/test';

import { millisecondsPerDay } from '#constants.ts';
import { paths } from '#e2e/constants.ts';
import { expect, test, visit } from '#e2e/test.ts';
import { getTracked, recordTracking } from '#e2e/tracking.ts';

const reloadEventName = 'build-version-reload';
const gapDays = 10;
const versionMetaPattern = /content="(\d+)" name="build-version"/;

function recordDocumentLoads(page: Page) {
	const loads: Array<string> = [];

	page.on('request', (request) => {
		if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
			loads.push(new URL(request.url()).pathname);
		}
	});

	return loads;
}

async function serveNewerBuild(page: Page, path: string) {
	await page.route(
		(url) => url.pathname === path,
		// Only the router's fetch; a fulfilled document fails Chromium's local network checks under dev
		async (route) => {
			if (route.request().isNavigationRequest()) return route.continue();

			const response = await route.fetch();
			const html = await response.text();
			const body = html.replace(
				versionMetaPattern,
				(_match, version: string) =>
					`content="${String(Number(version) + gapDays * millisecondsPerDay)}" name="build-version"`,
			);

			await route.fulfill({ body, response });
		},
	);
}

test('a soft navigation onto a newer build does a full load instead', async ({ page, site }) => {
	const loads = recordDocumentLoads(page);

	await recordTracking(page);
	await serveNewerBuild(page, site.postDetail);
	await visit(page, paths.postsIndex);
	await page.waitForLoadState('load');

	// Armed after the first load, so it resolves on the full load the navigation turns into
	const reloaded = page.waitForEvent('load');

	await page.locator(`main a[href="${site.postDetail}"]`).first().click();
	await reloaded;

	await expect
		.poll(() => getTracked(page, reloadEventName))
		.toEqual([{ data: { gapDays }, name: reloadEventName }]);
	expect(loads).toEqual([paths.postsIndex, site.postDetail]);

	await page.goBack();

	await expect(page).toHaveURL(paths.postsIndex);
});

test('a soft navigation within the same build stays soft and reports nothing', async ({
	page,
	site,
}) => {
	const loads = recordDocumentLoads(page);

	await recordTracking(page);
	await visit(page, paths.postsIndex);
	await page.waitForLoadState('load');
	await page.evaluate(() => Object.assign(globalThis, { isSameDocument: true }));
	await page.locator(`main a[href="${site.postDetail}"]`).first().click();

	await expect(page).toHaveURL(site.postDetail);

	expect(await page.evaluate(() => 'isSameDocument' in globalThis)).toBe(true);
	expect(loads).toEqual([paths.postsIndex]);
	expect(await getTracked(page, reloadEventName)).toEqual([]);
});
