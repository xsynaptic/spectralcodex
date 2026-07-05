import { expect, test } from '@playwright/test';

test.describe('sitemap', () => {
	test('index references the url sitemap', async ({ request }) => {
		const response = await request.get('/sitemap-index.xml');

		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toMatch(/xml/);

		const body = await response.text();
		expect(body).toContain('<sitemapindex');
		expect(body).toMatch(/<loc>[^<]*sitemap-0\.xml<\/loc>/);
	});

	test('url sitemap is non-empty', async ({ request }) => {
		const response = await request.get('/sitemap-0.xml');

		expect(response.status()).toBe(200);

		const body = await response.text();
		const urls = body.match(/<url>[\s\S]*?<\/url>/g);
		expect(urls).not.toBeNull();
		expect(urls!.length).toBeGreaterThan(0);
	});
});
