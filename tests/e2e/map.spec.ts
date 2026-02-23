import { expect, test } from '@playwright/test';

const POST_PATH = '/xinyi-taipei-101/';

test.describe('map', () => {
	test('map loads on Taipei 101 location page', async ({ page }) => {
		await page.goto(POST_PATH);

		// MapLibre GL creates a canvas element when it hydrates via client:visible
		const canvas = page.locator('canvas.maplibregl-canvas');

		await canvas.scrollIntoViewIfNeeded();
		await expect(canvas).toBeVisible({ timeout: 10_000 });
	});
});
