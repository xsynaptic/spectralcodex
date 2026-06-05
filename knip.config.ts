// eslint-disable-next-line @typescript-eslint/ban-ts-comment -- the @ts-nocheck below is deliberate; see its own reason
// @ts-nocheck -- KnipConfig is very expensive and we only need this when modifying the config
import type { KnipConfig } from 'knip';

export default {
	workspaces: {
		'.': {
			// MDX auto-import components; referenced via remark-auto-import, not static imports
			entry: ['src/components/mdx/*.astro'],
			ignoreBinaries: ['down', 'up', 'ssh-add'],
			ignoreDependencies: [
				'@spectralcodex/scripts', // used via pnpm --filter in scripts, not imported
				'eslint-plugin-jsx-a11y', // transitive dep required by eslint-plugin-astro jsx-a11y-strict
				'p-limit', // used in workspace packages (image-loader, scripts)
			],
		},
		'packages/content-demo': {
			ignore: ['collections/**'],
			ignoreBinaries: ['check-content-demo', 'format-content-demo'],
		},
		'packages/content': {
			entry: ['global.d.ts'],
			ignore: ['collections/**'],
			ignoreBinaries: ['check-content', 'format-content', 'validate-content'],
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
		'packages/remark-img-group': {
			ignoreDependencies: ['@types/unist'], // ambient types for unist ecosystem
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
