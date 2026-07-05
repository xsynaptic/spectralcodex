import { PATHS } from './constants.ts';
import { expect, test } from './fixtures.ts';

test.describe('map', () => {
	test('map loads on Taipei 101 location page', async ({ page }) => {
		await page.goto(PATHS.locationDetail, { waitUntil: 'domcontentloaded' });

		// MapLibre GL creates a canvas element when it hydrates via client:visible
		const canvas = page.locator('canvas.maplibregl-canvas');

		await canvas.scrollIntoViewIfNeeded();
		await expect(canvas).toBeVisible({ timeout: 10_000 });
	});
});
