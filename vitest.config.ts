import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// A positive offset makes late-evening UTC instants land in the next local day
		env: { TZ: 'Asia/Taipei' },
		exclude: ['**/node_modules/**', '.claude/worktrees/**', 'tests/e2e/**'],
	},
});
