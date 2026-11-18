import type { APIRequestContext, Locator, Page } from '@playwright/test';
import type { ShareKitPayload } from '@xsynaptic/share-kit';

import { test as baseTest } from '@playwright/test';

import { getBaseUrl, isDev, isProd } from '#e2e/constants.ts';
import { getSitePaths } from '#e2e/site-paths.ts';
import { expect, getSentEvents, stubUmami, test, visit } from '#e2e/test.ts';
import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

const iconsModuleName = 'share-dialog-icons';

let rendered: Promise<boolean> | undefined;

async function hasDialog(request: APIRequestContext, path: string) {
	const response = await request.get(path);
	const html = await response.text();

	return html.includes('<share-kit');
}

// Per worker, since every test in a run sees the same server
function isDialogRendered(request: APIRequestContext, path: string) {
	if (!rendered) rendered = hasDialog(request, path);

	return rendered;
}

function getTrigger(page: Page) {
	return page.getByRole('button', { name: t('share.dialog.trigger.label') });
}

function getDialog(page: Page) {
	return page.locator('share-kit .share-kit-dialog');
}

async function openDialog(page: Page, path: string) {
	await visit(page, path);
	await expect(getTrigger(page)).toBeEnabled();
	await getTrigger(page).click();
	await expect(getDialog(page)).toBeVisible();

	return getDialog(page);
}

function readPayload(page: Page) {
	return page
		.locator('share-kit > script[type="application/json"]')
		.evaluate((script) => JSON.parse(script.textContent) as ShareKitPayload<string>);
}

async function selectDestination(dialog: Locator, label: string) {
	await dialog.getByRole('radio', { name: label }).click();
}

async function openComposer(page: Page, dialog: Locator) {
	const [popup] = await Promise.all([
		page.waitForEvent('popup'),
		dialog.locator('.share-kit-primary').click(),
	]);

	return new URL(popup.url());
}

function expectEntryUrl(href: string, entryPath: string) {
	const url = new URL(href);

	expect(url.pathname).toBe(entryPath);
	expect(url.searchParams.get('utm_source')).toBe('x');
	expect(url.searchParams.get('utm_medium')).toBe('share');
}

test.describe('the share dialog', { tag: '@engines' }, () => {
	test.skip(!isDev, 'the local preview has no /og/ cards');

	test.beforeEach(async ({ request, site }) => {
		test.skip(!(await isDialogRendered(request, site.postDetail)), 'SHARE_DIALOG_SHOW is off');
	});

	test('the trigger ships disabled, enables, and opening reports to Umami', async ({
		page,
		site,
	}) => {
		await stubUmami(page);

		const response = await visit(page, site.postDetail);

		expect(await response?.text()).toMatch(/<button[^>]*data-share-kit-trigger[^>]*disabled/);
		await expect(getTrigger(page)).toBeEnabled();
		await getTrigger(page).click();
		await expect(getDialog(page)).toBeVisible();
		await expect(getDialog(page).getByRole('heading', { level: 2 })).toBeFocused();
		await expect
			.poll(() => getSentEvents(page, 'share-dialog'))
			.toEqual([{ data: { action: 'open', destination: 'any' }, name: 'share-dialog' }]);
	});

	test('the open hash opens the dialog and reports to Umami', async ({ page, site }) => {
		await stubUmami(page);
		await visit(page, `${site.postDetail}#share`);

		await expect(getDialog(page)).toBeVisible();
		await expect
			.poll(() => getSentEvents(page, 'share-dialog'))
			.toEqual([{ data: { action: 'open', destination: 'any' }, name: 'share-dialog' }]);
	});

	test('saving a card reports to Umami once the download finishes', async ({ page, site }) => {
		await stubUmami(page);

		const dialog = await openDialog(page, site.postDetail);
		const [download] = await Promise.all([
			page.waitForEvent('download'),
			dialog.locator('[data-share-kit-asset="landscape"] [data-share-kit-action="save"]').click(),
		]);

		expect(download.suggestedFilename()).toMatch(/\.(?:jpe?g|png|webp)$/);
		await expect
			.poll(() => getSentEvents(page, 'share-dialog'))
			.toEqual([
				{ data: { action: 'open', destination: 'any' }, name: 'share-dialog' },
				{
					data: { action: 'save', asset: 'landscape', destination: 'any', outcome: 'saved' },
					name: 'share-dialog',
				},
			]);
	});

	test('icons load on trigger intent, and every destination gets one', async ({ page, site }) => {
		const iconRequests: Array<string> = [];

		page.on('request', (request) => {
			if (request.url().includes(iconsModuleName)) iconRequests.push(request.url());
		});
		await visit(page, site.postDetail);
		await expect(getTrigger(page)).toBeEnabled();
		expect(iconRequests).toEqual([]);

		await getTrigger(page).hover();
		await expect.poll(() => iconRequests.length).toBe(1);
		await expect(getDialog(page)).toBeHidden();

		await getTrigger(page).click();

		const dialog = getDialog(page);
		const { settings } = await readPayload(page);
		await expect(dialog.locator('[data-share-kit-destination]')).toHaveCount(
			settings.destinations.length,
		);
		await expect(dialog.locator('[data-share-kit-destination]:not(:has(svg))')).toHaveCount(0);
	});

	test('X opens its composer with the tagged Entry link', async ({ context, page, site }) => {
		await context.route('https://x.com/**', (route) => route.fulfill({ body: 'composer' }));

		const dialog = await openDialog(page, site.postDetail);

		await selectDestination(dialog, 'X');

		const composer = await openComposer(page, dialog);
		const text = composer.searchParams.get('text') ?? '';

		expect(composer.origin + composer.pathname).toBe('https://x.com/intent/tweet');
		expect(text).toContain(site.postTitle);
		expectEntryUrl(/https?:\/\/\S+/.exec(text)?.[0] ?? '', site.postDetail);
	});

	test('card and photo tiles load', async ({ page, site }) => {
		const dialog = await openDialog(page, site.postDetail);
		const tiles = dialog.locator('[data-share-kit-asset]');
		const ids = await tiles.evaluateAll((elements: Array<HTMLElement>) =>
			elements.map((element) => element.dataset.shareKitAsset),
		);

		expect(ids).toEqual(expect.arrayContaining(['landscape', 'portrait', 'story', 'photo-1']));

		const tileList = await tiles.all();

		for (const tile of tileList) {
			const preview = tile.locator('img');

			await preview.scrollIntoViewIfNeeded();
			await expect
				.poll(() =>
					preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth),
				)
				.toBeGreaterThan(0);
			await expect(tile).not.toHaveAttribute('data-share-kit-state', 'failed');
		}
	});
});

// The dialog downloads photos with `fetch`, which fails without this header; no page needed, so the base test
baseTest(
	'photos on the image host allow the site origin',
	{ tag: '@smoke' },
	async ({ request }) => {
		baseTest.skip(!isProd, 'only the deployed image host sends it');

		const siteOrigin = new URL(getBaseUrl()).origin;
		const { postDetail } = await getSitePaths(request);
		const page = await request.get(postDetail);
		const html = await page.text();
		const photo = [...html.matchAll(/<img[^>]+src="(https:[^"]+)"/g)]
			.map(([, src = '']) => src)
			.find((src) => new URL(src).origin !== siteOrigin);

		expect(photo, 'a photo from the image host').toBeDefined();

		const response = await request.get(photo ?? '', { headers: { Origin: siteOrigin } });

		expect(response.ok()).toBe(true);
		expect(response.headers()['access-control-allow-origin']).toBe(siteOrigin);
	},
);
