// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- the @ts-nocheck below is deliberate; see its own reason
// @ts-nocheck -- KnipConfig is very expensive and we only need this when modifying the config
import type { KnipConfig } from 'knip';

export default {
	workspaces: {
		'.': {
			// MDX auto-import components; referenced via remark-auto-import, not static imports
			entry: ['src/components/mdx/*.astro'],
			ignore: [
				'src/components/parts/pagination.astro', // leftover component
				'deploy/cache-warmer/cache-warm.ts', // Docker container entrypoint, not imported
			],
			ignoreBinaries: ['ssh-add'],
			ignoreDependencies: [
				'@spectralcodex/scripts', // used via pnpm --filter in scripts, not imported
				'eslint-plugin-jsx-a11y', // peer of eslint-plugin-astro's flat/jsx-a11y-strict config; referenced by string, not import
				'p-limit', // used in workspace scripts packages
			],
		},
		'packages/content-demo': {
			entry: ['.mdxlintrc.mjs'],
			ignoreBinaries: ['check-content-demo', 'fix-content-demo'],
			ignoreDependencies: [
				'textlint-plugin-mdx', // referenced in .textlintrc.json
				'textlint-rule-diacritics',
				'@textlint-rule/textlint-rule-pattern',
			],
		},
		'packages/content': {
			entry: ['.mdxlintrc.mjs', 'global.d.ts'],
			ignoreBinaries: ['check-content', 'content-schemas', 'fix-content', 'validate-content'],
			ignoreDependencies: [
				'textlint-plugin-mdx', // referenced in .textlintrc.json
				'textlint-rule-diacritics',
				'textlint-rule-terminology',
				'@textlint-rule/textlint-rule-pattern',
			],
		},
		'packages/react-map-component': {
			ignoreDependencies: ['astro'],
		},
		'packages/scripts': {
			ignoreDependencies: [
				'@astrojs/markdown-remark', // peer dep
				'@fontsource/.+', // loaded dynamically via require.resolve in og-image
				'astro', // used via CLI, not imported
			],
		},
	},
} satisfies KnipConfig;
