import { expect, test, visit } from '#e2e/test.ts';

test('the map loads on a Location', { tag: '@smoke' }, async ({ page, site }) => {
	await visit(page, site.locationDetail);

	// The island is server-rendered; the canvas only follows once client:visible hydrates it
	const island = page.locator(
		'astro-island[client="visible"][component-export="ReactMapComponent"]',
	);

	await island.scrollIntoViewIfNeeded();

	await expect(island.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 10_000 });
});

test("a Location's own Point opens its popup", async ({ page, site }) => {
	await visit(page, site.locationDetail);

	const island = page.locator(
		'astro-island[client="visible"][component-export="ReactMapComponent"]',
	);
	const canvas = island.locator('canvas.maplibregl-canvas');
	const ownPoint = island.locator('.maplibregl-marker').first();

	await island.scrollIntoViewIfNeeded();
	await expect(ownPoint).toBeVisible({ timeout: 10_000 });

	// A pointer cursor means the Point under the ring is drawn and takes a click
	await expect(async () => {
		await canvas.hover({ position: { x: 1, y: 1 } });
		await ownPoint.hover();

		await expect(canvas).toHaveCSS('cursor', 'pointer', { timeout: 500 });
	}).toPass({ timeout: 10_000 });

	await ownPoint.click();

	await expect(island.locator('.maplibregl-popup .map-popup-title')).toContainText(
		site.locationTitle,
		{ timeout: 10_000 },
	);
});
