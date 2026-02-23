import { expect, test } from "@playwright/test";

import { getTranslations } from "#lib/i18n/i18n-translations.ts";

const t = getTranslations();

test.describe("homepage", () => {
	test("loads with 200 status", async ({ page }) => {
		const response = await page.goto("/");

		expect(response?.status()).toBe(200);
	});

	test("title contains site name", async ({ page }) => {
		await page.goto("/");

		await expect(page).toHaveTitle(new RegExp(t("site.title")));
	});

	test("navigation is present", async ({ page }) => {
		await page.goto("/");

		await expect(
			page.getByRole("navigation", { name: t("site.menu.header.label") }),
		).toBeVisible();
	});

	test("page has visible content", async ({ page }) => {
		await page.goto("/");

		await expect(page.locator("main")).toBeVisible();
	});
});
