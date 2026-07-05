import { test as base } from '@playwright/test';

// Block every non-local host so the smoke suite stays hermetic
export const test = base.extend({
	page: async ({ page }, use) => {
		await page.route(
			(url) => url.hostname !== 'localhost' && url.hostname !== '127.0.0.1',
			(route) => route.abort(),
		);

		await use(page);
	},
});

export { expect } from '@playwright/test';
