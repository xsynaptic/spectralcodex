import path from 'node:path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

// eslint-disable-next-line unicorn/no-top-level-side-effects -- load test env into process.env before defineConfig reads it
Object.assign(process.env, loadEnv('test', process.cwd(), ''), {
	CONTENT_MEDIA_PATH_HOST: path.resolve(process.cwd(), 'packages/content-demo/media'), // Fixtures
	IMAGE_SERVER_NGINX_CONFIG: path.resolve(process.cwd(), 'deploy/nginx.conf.template'),
});

export default defineConfig({
	test: {
		include: ['tests/image-server/integration.test.ts'],
		globalSetup: ['tests/image-server/setup-docker.ts'],
		testTimeout: 10_000,
		hookTimeout: 60_000,
		teardownTimeout: 30_000,
	},
});
