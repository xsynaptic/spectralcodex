import { expect, test } from "@playwright/test";

import { getTranslations } from "#lib/i18n/i18n-translations.ts";

const t = getTranslations();

test.describe("rss feed", () => {
	test("feed exists and is valid RSS", async ({ request }) => {
		const response = await request.get("/rss.xml");

		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toMatch(/xml/);

		const body = await response.text();

		expect(body).toContain("<rss");
		expect(body).toContain("<channel>");
		expect(body).toContain(`<title>${t("site.title")}</title>`);
	});

	test("first 5 items have titles, links, and content", async ({
		request,
	}) => {
		const response = await request.get("/rss.xml");
		const body = await response.text();

		const items = body.match(/<item>[\s\S]*?<\/item>/g);
		expect(items).not.toBeNull();
		expect(items!.length).toBeGreaterThanOrEqual(5);

		for (const item of items!.slice(0, 5)) {
			// Has a non-empty title
			const title = /<title>(.*?)<\/title>/.exec(item);
			expect(title).not.toBeNull();
			expect(title![1]!.trim().length).toBeGreaterThan(0);

			// Has a non-empty link
			const link = /<link>(.*?)<\/link>/.exec(item);
			expect(link).not.toBeNull();
			expect(link![1]!.trim().length).toBeGreaterThan(0);

			// Has non-empty content:encoded (catches blank publish bug)
			const content = /<content:encoded>([\s\S]*?)<\/content:encoded>/.exec(
				item,
			);
			expect(content).not.toBeNull();
			expect(content![1]!.trim().length).toBeGreaterThan(100);
		}
	});
});
