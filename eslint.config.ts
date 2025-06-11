import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import { getConfig } from '@xsynaptic/eslint-config';
import globals from 'globals';

export default getConfig(
	[
		{
			ignores: ['**/.astro', '**/.astro-cache', 'dist/**/*', 'content/**/*', 'temp/**/*'],
		},
		/**
		 * React
		 */
		// Note 2024Q4: React Hooks plugin not yet compatible with tseslint and flat config
		// There are some workarounds but they seem like more trouble than it's worth
		// Wait for some post 5.0.0 update?
		{
			files: ['packages/react-map-component/**/*.ts', 'packages/react-map-component/**/*.tsx'],
			plugins: {
				'@tanstack/query': tanstackQueryPlugin,
				// 'react-hooks': reactHooksPlugin,
			},
			rules: {
				...tanstackQueryPlugin.configs.recommended.rules,
				// ...reactHooksPlugin.configs.recommended,
			},
		},
		// Those files run in the browser and need the browser globals
		{
			files: ['src/components/**/*', 'src/components/**/*/*.ts'],
			languageOptions: {
				globals: {
					...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, 'off'])),
					...globals.browser,
				},
			},
			rules: {
				// This conflicts with how some client-side code is handled
				'unicorn/prefer-global-this': 'off',
			},
		},
	],
	// TODO: Astro TypeScript support became buggy around March 2025; disabling this until a fix is found
	{ customGlobals: { theme: 'readonly' }, withAstro: false },
);
