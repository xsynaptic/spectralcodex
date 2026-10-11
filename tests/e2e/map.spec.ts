import { expect, test, visit } from '#e2e/test.ts';

test('the map loads on a Location', async ({ page, site }) => {
	await visit(page, site.locationDetail);

	// The island is server-rendered; the canvas only follows once client:visible hydrates it
	const island = page.locator(
		'astro-island[client="visible"][component-export="ReactMapComponent"]',
	);

	await island.scrollIntoViewIfNeeded();

	await expect(island.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10_000 });
});
