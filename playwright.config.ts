import { defineConfig, devices } from '@playwright/test';

import { getBaseUrl, isAllEngines, isDev, isProd, localPort, localUrl } from '#e2e/constants.ts';

const engineGrep = isAllEngines ? [/@engines/] : [];

// The dev server renders each page on request, taking seconds per page once workers contend for it
const expectTimeout = isDev ? 12_000 : 5000;

export default defineConfig({
	// `toPass` ignores the expect timeout and would otherwise retry until the test times out
	expect: { timeout: expectTimeout, toPass: { timeout: expectTimeout } },
	fullyParallel: true,
	outputDir: './temp/playwright-results',
	projects: [
		{
			grepInvert: /@bfcache/,
			name: 'chromium',
			use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-gpu'] } },
		},
		{
			grep: /@bfcache/,
			name: 'chromium-bfcache',
			use: {
				...devices['Desktop Chrome'],
				channel: 'chromium',
				launchOptions: {
					args: ['--enable-gpu'],
					ignoreDefaultArgs: ['--disable-back-forward-cache'],
				},
			},
			workers: 1,
		},
		{
			grep: [/@firefox/, ...engineGrep],
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] },
			workers: 1,
		},
		{
			grep: [/@webkit/, ...engineGrep],
			name: 'webkit',
			use: { ...devices['Desktop Safari'] },
			workers: 1,
		},
	],
	reporter: [['list'], ['html', { open: 'never', outputFolder: './temp/playwright-report' }]],
	retries: 0,
	testDir: './tests/e2e',
	timeout: isDev ? 60_000 : 15_000,
	use: {
		baseURL: getBaseUrl(),
	},
	...(isDev ? { workers: 3 } : {}),
	...(isProd || isDev
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
