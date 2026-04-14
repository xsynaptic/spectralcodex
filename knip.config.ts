// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck -- KnipConfig is very expensive and we only need this when modifying the config
import type { KnipConfig } from 'knip';

export default {
	workspaces: {
		'.': {
			// MDX auto-import components; referenced via astro-auto-import, not static imports
			entry: ['src/components/mdx/*.astro'],
			ignoreBinaries: ['down', 'up', 'ssh-add'],
			ignoreDependencies: [
				'@astrojs/markdown-remark', // peer dep, used transitively by remark pipeline
				'@spectralcodex/scripts', // used via pnpm --filter in scripts, not imported
				'@xsynaptic/image-server', // workspace package used at deploy time
				'eslint-plugin-jsx-a11y', // transitive dep required by eslint-plugin-astro jsx-a11y-strict
				'p-limit', // used in workspace packages (image-loader, scripts)
				'unified', // transitive dep of @xsynaptic/unified-tools
			],
		},
		'packages/content-demo': {
			ignore: ['collections/**'],
		},
		'packages/content': {
			entry: ['.mdxlintrc.mjs'],
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
