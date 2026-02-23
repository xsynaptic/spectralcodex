import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://localhost:4321';

export default defineConfig({
	testDir: './tests/e2e',
	outputDir: './temp/playwright-results',
	timeout: 10_000,
	retries: 0,
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
		command: 'pnpm preview',
		url: baseURL,
		reuseExistingServer: true,
	},
});
