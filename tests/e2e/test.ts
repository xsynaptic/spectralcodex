import type { Page, Response } from '@playwright/test';

import { test as base, expect } from '@playwright/test';

import type { SitePaths } from '#e2e/site-paths.ts';

import { getBaseUrl, isDev } from '#e2e/constants.ts';
import { getSitePaths } from '#e2e/site-paths.ts';

export { expect } from '@playwright/test';

export interface ConsoleGuard {
	allow: (...patterns: Array<RegExp>) => void;
}

const allowedHost = new URL(getBaseUrl()).host;

// Cloudflare injects a beacon at the edge, and the empty off-host answer fails Chromium's SRI check and WebKit's MIME check
const blockedResourcePattern = /static\.cloudflareinsights\.com/;

// Under dev, Vite logs to the console, a dependency re-optimization returns a 504 once, and `/_img` fails while Docker is down
const devPatterns = isDev ? [/\[vite\]/, /Outdated Optimize Dep/, /\/_img\//] : [];

export const test = base.extend<{ consoleGuard: ConsoleGuard; site: SitePaths }>({
	// Automatic so no spec can forget it, and since it costs a page, specs that only make requests use the base test
	consoleGuard: [
		async ({ page }, use) => {
			const errors: Array<string> = [];
			const allowed: Array<RegExp> = [blockedResourcePattern, ...devPatterns];

			// Chromium leaves the URL out of a failed resource's text, so patterns also see where the message came from
			page.on('console', (message) => {
				if (message.type() === 'error')
					errors.push(`${message.text()} (${message.location().url})`);
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

	// Fulfilled empty rather than aborted, because an abort logs a console error of its own
	page: async ({ page }, use) => {
		await page.route(
			(url) => url.host !== allowedHost,
			(route) => route.fulfill({ body: '', status: 204 }),
		);

		// The dev toolbar's open shadow root adds headings and buttons that locators would match
		if (isDev) {
			await page.route(
				(url) => url.pathname.includes('/dev-toolbar/'),
				(route) => route.fulfill({ body: '', contentType: 'text/javascript' }),
			);
		}

		await use(page);
	},

	site: async ({ request }, use) => {
		await use(await getSitePaths(request));
	},
});

export function visit(page: Page, path: string): Promise<null | Response> {
	return page.goto(path, { waitUntil: 'domcontentloaded' });
}
