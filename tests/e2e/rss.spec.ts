import { expect, test } from '@playwright/test';

import { getTranslations } from '#lib/i18n/i18n-translations.ts';

const t = getTranslations();

function getElementText(item: string, pattern: RegExp) {
	return pattern.exec(item)?.[1]?.trim() ?? '';
}

test.describe('rss feed', { tag: '@smoke' }, () => {
	test('feed exists and is valid RSS', async ({ request }) => {
		const response = await request.get('/rss.xml');

		expect(response.status()).toBe(200);
		expect(response.headers()['content-type']).toMatch(/xml/);

		const body = await response.text();

		expect(body).toContain('<rss');
		expect(body).toContain('<channel>');
		expect(body).toContain(`<title>${t('site.title')}</title>`);
	});

	test('first 5 items have titles, links, and content', async ({ request }) => {
		const response = await request.get('/rss.xml');
		const body = await response.text();
		const items = body.match(/<item>[\s\S]*?<\/item>/g) ?? [];

		expect(items.length).toBeGreaterThanOrEqual(5);

		for (const item of items.slice(0, 5)) {
			const content = getElementText(item, /<content:encoded>([\s\S]*?)<\/content:encoded>/);

			expect(getElementText(item, /<title>(.*?)<\/title>/)).not.toBe('');
			expect(getElementText(item, /<link>(.*?)<\/link>/)).not.toBe('');
			// Catches the blank publish bug
			expect(content.length).toBeGreaterThan(100);
		}
	});
});
