import { defineConfig } from 'vitest/config';

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
