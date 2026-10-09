import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

Object.assign(process.env, loadEnv('test', process.cwd(), ''));

export default defineConfig({
	test: {
		globalSetup: ['tests/image-server/setup-docker.ts'],
		hookTimeout: 60_000,
		include: ['tests/image-server/integration.test.ts'],
		teardownTimeout: 30_000,
		testTimeout: 10_000,
	},
});
