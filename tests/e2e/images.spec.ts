import type { Locator, Page } from "@playwright/test";

import { expect, test } from "@playwright/test";

const POST_PATH = "/huadong-valley-ride-2018-taitung-city/";

/** Get currentSrc from an img element, scrolling into view and waiting for lazy load if needed */
async function getCurrentSrc(page: Page, img: Locator): Promise<string> {
	await img.scrollIntoViewIfNeeded();
	await expect(img).toBeVisible();

	await page.waitForFunction(
		(element) => (element as HTMLImageElement).currentSrc !== "",
		await img.elementHandle(),
	);

	return img.evaluate((element: HTMLImageElement) => element.currentSrc);
}

/** Fetch an image URL in the browser and return its natural dimensions */
function getImageDimensions(page: Page, src: string) {
	return page.evaluate(
		(url) =>
			new Promise<{ width: number; height: number }>((resolve, reject) => {
				const img = new Image();

				img.addEventListener("load", () => {
					resolve({ width: img.naturalWidth, height: img.naturalHeight });
				});
				img.addEventListener("error", () => {
					reject(new Error(`Failed to load image: ${url}`));
				});
				img.src = url;
			}),
		src,
	);
}

test.describe("images - desktop (1280x720)", () => {
	test.use({ viewport: { width: 1280, height: 720 } });

	test("hero image serves optimized size", async ({ page }) => {
		await page.goto(POST_PATH);

		const src = await getCurrentSrc(page, page.locator("img").first());
		const { width } = await getImageDimensions(page, src);

		expect(width).toBeGreaterThan(0);
		expect(width).toBeLessThanOrEqual(1800);
	});

	test("first content image serves optimized size", async ({ page }) => {
		await page.goto(POST_PATH);

		const src = await getCurrentSrc(
			page,
			page.locator("article img, main img").nth(1),
		);
		const { width } = await getImageDimensions(page, src);

		expect(width).toBeGreaterThan(0);
		expect(width).toBeLessThanOrEqual(1400);
	});
});

test.describe("images - mobile (390x844)", () => {
	test.use({ viewport: { width: 390, height: 844 } });

	test("hero image serves smaller than desktop", async ({ page }) => {
		await page.goto(POST_PATH);

		const src = await getCurrentSrc(page, page.locator("img").first());
		const { width } = await getImageDimensions(page, src);

		expect(width).toBeGreaterThan(0);
		expect(width).toBeLessThanOrEqual(600);
	});

	test("first content image serves smaller than desktop", async ({ page }) => {
		await page.goto(POST_PATH);

		const src = await getCurrentSrc(
			page,
			page.locator("article img, main img").nth(1),
		);
		const { width } = await getImageDimensions(page, src);

		expect(width).toBeGreaterThan(0);
		expect(width).toBeLessThanOrEqual(600);
	});
});
