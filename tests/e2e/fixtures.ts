import type { Page, Response } from '@playwright/test';

import { test as base, expect } from '@playwright/test';

import type { SitePaths } from './site-paths.ts';

import { getBaseUrl } from './constants.ts';
import { getSitePaths } from './site-paths.ts';

export { expect } from '@playwright/test';

interface ConsoleGuard {
	allow: (...patterns: Array<RegExp>) => void;
}

const allowedHost = new URL(getBaseUrl()).host;

export const test = base.extend<{ consoleGuard: ConsoleGuard; site: SitePaths }>({
	// Automatic so no spec can forget it; it costs a page, so request-only specs use the base test
	consoleGuard: [
		async ({ page }, use) => {
			const errors: Array<string> = [];
			const allowed: Array<RegExp> = [];

			page.on('console', (message) => {
				if (message.type() === 'error') errors.push(message.text());
			});
			page.on('pageerror', (error) => {
				errors.push(error.message);
			});

			await use({
				allow: (...patterns) => {
					allowed.push(...patterns);
				},
			});

			const unexpected = errors.filter((error) => allowed.every((pattern) => !pattern.test(error)));

			expect(unexpected, 'unexpected console errors').toEqual([]);
		},
		{ auto: true },
	],

	// Fulfilled empty rather than aborted; an abort logs a console error of its own
	page: async ({ page }, use) => {
		await page.route(
			(url) => url.host !== allowedHost,
			(route) => route.fulfill({ body: '', status: 204 }),
		);

		await use(page);
	},

	site: async ({ request }, use) => {
		await use(await getSitePaths(request));
	},
});

export function visit(page: Page, path: string): Promise<null | Response> {
	return page.goto(path, { waitUntil: 'domcontentloaded' });
}
