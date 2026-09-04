import { getViteConfig } from 'astro/config';

export default getViteConfig({
	test: {
		exclude: ['**/node_modules/**', '**/integration.test.ts', 'tests/e2e/**'],
	},
});
