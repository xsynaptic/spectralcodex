import { expect, test } from '@playwright/test';

import { prodUrl } from '#e2e/constants.ts';

test.describe('sitemap', { tag: '@smoke' }, () => {
	test('index references the url sitemap', async ({ request }) => {
		const response = await request.get('/sitemap-index.xml');

		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toMatch(/xml/);

		const body = await response.text();

		expect(body).toContain('<sitemapindex');
		expect(body).toMatch(/<loc>[^<]*sitemap-0\.xml<\/loc>/);
	});

	test('url sitemap covers the site', async ({ request }) => {
		const response = await request.get('/sitemap-0.xml');

		expect(response.status()).toBe(200);

		const body = await response.text();
		const urls = body.match(/<url>[\s\S]*?<\/url>/g) ?? [];

		expect(urls.length).toBeGreaterThan(5000);

		const offHost = [...body.matchAll(/<loc>([^<]*)<\/loc>/g)]
			.map(([, location = '']) => location)
			.filter((location) => !location.startsWith(prodUrl));

		expect(offHost.slice(0, 5), 'sitemap URLs off the production host').toEqual([]);
	});
});
