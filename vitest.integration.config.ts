import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line unicorn/no-top-level-side-effects -- load test env into process.env before defineConfig reads it
Object.assign(process.env, loadEnv('test', process.cwd(), ''));

export default defineConfig({
	test: {
		globals: true,
		include: ['tests/image-server/integration.test.ts'],
		globalSetup: ['tests/image-server/setup-docker.ts'],
		testTimeout: 10_000,
		hookTimeout: 60_000,
		teardownTimeout: 30_000,
	},
});
