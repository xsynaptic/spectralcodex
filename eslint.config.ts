import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import { getConfig } from '@xsynaptic/eslint-config';
import astroPlugin from 'eslint-plugin-astro';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

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
		/**
		 * Astro support; with some help from...
		 * @reference - https://github.com/Princesseuh/erika.florist/blob/main/eslint.config.js
		 */
		...astroPlugin.configs['flat/recommended'],
		...astroPlugin.configs['jsx-a11y-strict'],
		{
			files: ['**/*.astro'],
			// Remove some safety rules around `any` for various reasons
			// Astro.props isn't typed correctly in some contexts, so a bunch of things ends up being `any`
			rules: {
				'@typescript-eslint/no-unsafe-argument': 'off',
				'@typescript-eslint/no-unsafe-assignment': 'off',
				'@typescript-eslint/no-unsafe-call': 'off',
				'@typescript-eslint/no-unsafe-member-access': 'off',
				'@typescript-eslint/no-unsafe-return': 'off',
			},
		},
		// Disable typed rules for scripts inside Astro files
		{
			files: ['**/*.astro/*.ts', '*.astro/*.ts'],
			...tseslint.configs.disableTypeChecked,
		},
	],
	{
		customGlobals: { mode: 'readonly' },
		// Note: Astro's TypeScript linting support is incompatible with the newer `projectService` option
		parserOptions: { project: './tsconfig.json' },
	},
);
