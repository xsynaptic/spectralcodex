import { defineConfig, devices } from '@playwright/test';

import { getBaseUrl, isProd, localPort, localUrl } from '#e2e/constants.ts';

export default defineConfig({
	fullyParallel: true,
	outputDir: './temp/playwright-results',
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-gpu'] } },
		},
		{ grep: /@firefox/, name: 'firefox', use: { ...devices['Desktop Firefox'] }, workers: 1 },
		{ grep: /@webkit/, name: 'webkit', use: { ...devices['Desktop Safari'] }, workers: 1 },
	],
	reporter: [['list'], ['html', { open: 'never', outputFolder: './temp/playwright-report' }]],
	retries: 0,
	testDir: './tests/e2e',
	timeout: 15_000,
	use: {
		baseURL: getBaseUrl(),
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
