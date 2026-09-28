import type { KnipConfig } from 'knip';

export default {
	workspaces: {
		'.': {
			// MDX auto-import components; referenced via remark-auto-import, not static imports
			// The inventory page is injected as a route under `astro dev`, never imported
			entry: [
				'src/components/mdx/*.astro',
				'src/dev/inventory/inventory.astro',
				'src/dev/inventory/inventory-og-image.ts',
				'deploy/cache-warmer/cache-warm.ts', // Docker container entrypoint, not imported
			],
			ignoreDependencies: [
				'eslint-plugin-jsx-a11y', // peer of eslint-plugin-astro's flat/jsx-a11y-strict config; referenced by string, not import
			],
		},
		'packages/content': {
			entry: ['global.d.ts'],
			ignoreBinaries: ['check-content', 'content-schemas', 'fix-content', 'validate-content'],
			ignoreDependencies: [
				'mdxlint', // Enables knip's MDX plugin here (no `astro` devDep to do it)
			],
		},
		'packages/content-demo': {
			entry: ['.mdxlintrc.mjs'],
			ignoreBinaries: ['check-content-demo', 'fix-content-demo'],
		},
		'packages/scripts': {
			ignoreBinaries: ['ssh-add'],
			ignoreDependencies: [
				'@fontsource/.+', // loaded dynamically via require.resolve in og-image
			],
		},
	},
} satisfies KnipConfig;
