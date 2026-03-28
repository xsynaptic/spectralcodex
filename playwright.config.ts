import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4321';

export default defineConfig({
	testDir: './tests/e2e',
	outputDir: './temp/playwright-results',
	timeout: 15_000,
	retries: 3,
	reporter: 'list',
	use: {
		baseURL,
		...devices['Desktop Chrome'],
	},
	projects: [
		{
			name: 'chromium',
		},
	],
	webServer: {
		command: 'pnpm astro preview',
		url: baseURL,
		reuseExistingServer: true,
	},
});
