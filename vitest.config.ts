import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		exclude: [
			'**/node_modules/**',
			'.claude/worktrees/**',
			'**/integration.test.ts',
			'tests/e2e/**',
		],
	},
});
