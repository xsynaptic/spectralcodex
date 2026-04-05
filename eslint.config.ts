import type { ESLint } from 'eslint';

import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import { getConfig } from '@xsynaptic/eslint-config';
import astroPlugin from 'eslint-plugin-astro';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const isStrictLint = process.env.ESLINT_STRICT === '1';

export default getConfig(
	[
		{
			ignores: [
				'node_modules/**/*',
				'**/.astro/**/*',
				'**/.cache/**/*',
				'**/dist/**/*',
				'deploy/**/*',
				'packages/content/**/*',
				'**/.mdxlintrc.mjs',
				'**/temp/**/*',
			],
		},
		{
			rules: {
				// Conflicts with Remeda's sort function
				'unicorn/no-array-sort': 'off',
				// Conflicts with Prettier, which always uppercases hex digits and is not configurable
				'unicorn/number-literal-case': 'off',
				// Expensive type-aware rules; only run in strict mode
				'@typescript-eslint/no-deprecated': isStrictLint ? 'error' : 'off',
				'@typescript-eslint/no-unsafe-assignment': isStrictLint ? 'error' : 'off',
				'@typescript-eslint/no-misused-promises': isStrictLint ? 'error' : 'off',
			},
		},
		/**
		 * JSX
		 */
		{
			files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts', '**/*.astro'],
			rules: {
				'no-restricted-syntax': [
					'error',
					{
						message:
							'Use a ternary returning undefined (condition ? <Element /> : undefined) instead of && for conditional rendering.',
						selector:
							':matches(JSXElement, JSXFragment) > JSXExpressionContainer > LogicalExpression[operator="&&"]',
					},
				],
			},
		},
		/**
		 * React
		 */
		{
			files: ['packages/react-map-component/**/*.{js,jsx,ts,tsx}'],
			plugins: {
				'@tanstack/query': tanstackQueryPlugin as unknown as ESLint.Plugin,
				'react-hooks': reactHooksPlugin as unknown as ESLint.Plugin,
			},
			rules: {
				...tanstackQueryPlugin.configs.recommended.rules,
				...reactHooksPlugin.configs['recommended-latest'].rules,
				'react-hooks/component-hook-factories': 'warn',
				'react-hooks/config': 'warn',
				'react-hooks/error-boundaries': 'warn',
				'react-hooks/gating': 'warn',
				'react-hooks/globals': 'warn',
				'react-hooks/immutability': 'warn',
				'react-hooks/incompatible-library': 'warn',
				'react-hooks/preserve-manual-memoization': 'warn',
				'react-hooks/purity': 'warn',
				'react-hooks/refs': 'warn',
				'react-hooks/set-state-in-effect': 'warn',
				'react-hooks/set-state-in-render': 'warn',
				'react-hooks/static-components': 'warn',
				'react-hooks/unsupported-syntax': 'warn',
				'react-hooks/use-memo': 'warn',
			},
		},
		// These files run in the browser and might need the browser globals
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
		 * Astro
		 */
		...astroPlugin.configs['flat/recommended'],
		...astroPlugin.configs['jsx-a11y-strict'],
		// Split into two blocks so disableTypeChecked doesn't clobber our parserOptions
		{
			files: ['**/*.astro'],
			languageOptions: {
				parserOptions: {
					parser: tseslint.parser,
					extraFileExtensions: ['.astro'],
				},
			},
		},
		// Type-aware rules can't properly resolve types in .astro files; `astro check` handles this
		// Keep frontmatter thin and push logic into .ts files for full lint coverage
		{
			files: ['**/*.astro'],
			...tseslint.configs.disableTypeChecked,
		},
	],
	{
		customGlobals: { mode: 'readonly' },
	},
);
