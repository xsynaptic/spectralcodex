import { defineConfig, devices } from '@playwright/test';

const isProd = process.env.TEST_ENV === 'prod';
const localURL = 'http://localhost:4321';

function getBaseURL(): string {
	if (!isProd) return localURL;
	if (!process.env.PROD_SERVER_URL) {
		throw new Error('PROD_SERVER_URL env var is required when running test-e2e-prod');
	}
	return process.env.PROD_SERVER_URL;
}

const baseURL = getBaseURL();

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
	...(isProd
		? {}
		: {
				webServer: {
					command: 'pnpm astro preview',
					url: localURL,
					reuseExistingServer: true,
				},
			}),
});
