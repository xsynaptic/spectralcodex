import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import { getConfig } from '@xsynaptic/eslint-config';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default getConfig(
	[
		{
			ignores: ['**/.astro', '**/.astro-cache', 'dist/**/*', 'content/**/*', 'temp/**/*'],
		},
		/**
		 * React
		 */
		{
			files: ['packages/react-map-component/**/*.ts', 'packages/react-map-component/**/*.tsx'],
			plugins: {
				'@tanstack/query': tanstackQueryPlugin,
				'react-hooks': reactHooksPlugin,
			},
			rules: {
				...tanstackQueryPlugin.configs.recommended.rules,
				...reactHooksPlugin.configs['recommended-latest'].rules,
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
	{ customGlobals: { mode: 'readonly' }, withAstro: false },
);
