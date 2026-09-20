import { expect, test, visit } from './fixtures.ts';

test('the map loads on a Location', async ({ page, site }) => {
	await visit(page, site.locationDetail);

	// The island is server-rendered; the canvas only follows once client:visible hydrates it
	await page.locator('astro-island[component-export="ReactMapComponent"]').scrollIntoViewIfNeeded();

	await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10_000 });
});
