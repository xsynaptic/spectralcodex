import { defineConfig, devices } from '@playwright/test';

const isProd = process.env.TEST_ENV === 'prod';

// Obscure port to avoid colliding with other projects' dev servers on Astro's default 4321
const localPort = 47_321;
const localURL = `http://localhost:${String(localPort)}`;

function getBaseURL(): string {
	if (!isProd) return localURL;
	if (!process.env.PROD_SERVER_URL) {
		throw new Error('PROD_SERVER_URL env var is required when running test-e2e-prod');
	}
	return process.env.PROD_SERVER_URL;
}

const baseURL = getBaseURL();

const isCI = !!process.env.CI;

export default defineConfig({
	// Locally, bail early so a systemic failure surfaces fast instead of retrying every test
	maxFailures: isCI ? 0 : 3,
	outputDir: './temp/playwright-results',
	projects: [
		{
			name: 'chromium',
		},
	],
	reporter: 'list',
	retries: isCI ? 3 : 0,
	testDir: './tests/e2e',
	timeout: 15_000,
	use: {
		baseURL,
		...devices['Desktop Chrome'],
	},
	...(isProd
		? {}
		: {
				webServer: {
					command: `pnpm astro preview --port ${String(localPort)}`,
					env: { ASTRO_PREVIEW_BACKGROUND: '0' },
					reuseExistingServer: true,
					url: localURL,
				},
			}),
});
