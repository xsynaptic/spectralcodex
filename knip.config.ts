import type { KnipConfig } from 'knip';

export default {
	workspaces: {
		'.': {
			// MDX auto-import components — referenced via astro-auto-import, not static imports
			entry: ['src/components/mdx/*.astro'],
			ignoreDependencies: [
				'@astrojs/check', // used via `astro check` CLI, peer dep of astro
				'@astrojs/markdown-remark', // peer dep, used transitively by remark pipeline
				'@spectralcodex/scripts', // used via pnpm --filter in scripts, not imported
				'@xsynaptic/image-server', // workspace package used at deploy time
				'eslint-plugin-jsx-a11y', // transitive dep required by eslint-plugin-astro jsx-a11y-strict
				'p-limit', // used in workspace packages (image-loader, scripts)
				'unified', // transitive dep of @xsynaptic/unified-tools
			],

		},
		'packages/content-demo': {
			entry: ['.remarkrc.mjs'],
			ignoreDependencies: ['remark'], // type-only import in .remarkrc.mjs
		},
		'packages/content': {
			entry: ['.remarkrc.mjs'],
			ignoreDependencies: [
				'eslint-mdx', // used in workspace eslint.config.mjs (knip doesn't detect)
				'eslint-plugin-mdx', // used in workspace eslint.config.mjs
				'remark', // type-only import in .remarkrc.mjs
				'textlint-plugin-mdx', // referenced in .textlintrc.json
				'textlint-rule-diacritics',
				'textlint-rule-terminology',
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
