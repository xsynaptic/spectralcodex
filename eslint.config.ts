import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import { getConfig } from '@xsynaptic/eslint-config';
import globals from 'globals';

export default getConfig(
	[
		{
			ignores: ['**/.astro', '**/.astro-cache', 'dist/**/*', 'content/**/*'],
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
			files: ['src/components/*'],
			languageOptions: {
				globals: {
					...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, 'off'])),
					...globals.browser,
				},
			},
		},
	],
	{ customGlobals: { theme: 'readonly' }, withAstro: true },
);
