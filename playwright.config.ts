import { defineConfig, devices } from '@playwright/test';

import { getBaseUrl, isProd, localPort, localUrl } from './tests/e2e/constants.ts';

export default defineConfig({
	fullyParallel: true,
	// Bail early so a systemic failure surfaces fast
	maxFailures: 3,
	outputDir: './temp/playwright-results',
	projects: [
		{
			name: 'chromium',
		},
	],
	reporter: 'list',
	retries: 0,
	testDir: './tests/e2e',
	timeout: 15_000,
	use: {
		baseURL: getBaseUrl(),
		...devices['Desktop Chrome'],
		trace: 'retain-on-failure',
	},
	...(isProd
		? {}
		: {
				webServer: {
					command: `pnpm astro preview --port ${String(localPort)}`,
					env: { ASTRO_PREVIEW_BACKGROUND: '0' },
					reuseExistingServer: true,
					url: localUrl,
				},
			}),
});
