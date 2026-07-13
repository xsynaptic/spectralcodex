import type { ESLint } from 'eslint';

import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import {
	getAstroConfig,
	getConfig,
	getWebComponentConfig,
	restrictedSyntaxDefaults,
} from '@xsynaptic/eslint-config';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

const webComponentConfig = getWebComponentConfig(['src/components/**/*.ts']);

export default getConfig(
	[
		{
			ignores: [
				'node_modules/**/*',
				'**/.astro/**/*',
				'**/.cache/**/*',
				'**/dist/**/*',
				'deploy/**/*',
				'!deploy/cache-warmer',
				'!deploy/cache-warmer/cache-warm.ts',
				'packages/content/**/*',
				'**/.mdxlintrc.mjs',
				'**/temp/**/*',
			],
		},
		{
			rules: {
				// Ban logical-assignment shorthand (??=, ||=, &&=); the expanded form reads more clearly
				'logical-assignment-operators': ['error', 'never'],
				// Conflicts with Remeda's sort function
				'unicorn/no-array-sort': 'off',
				// `WebSite` etc. intentionally mirror schema.org's canonical type names
				'unicorn/consistent-compound-words': 'off',
				// @TODO: re-enable and fix; currently there are 80+ issues reported by this rule
				'unicorn/consistent-boolean-name': 'off',
				// Refactor-heavy: wants nested loops extracted into functions
				'unicorn/no-break-in-nested-loop': 'off',
				// False positives: map glyph URLs, i18n tokens, and shell format strings use literal braces
				'unicorn/no-incorrect-template-string-interpolation': 'off',
			},
		},
		// Opt out of recommended-natural sort rules to avoid churn in this mature project;
		// re-enable individually to adopt incrementally. sort-imports stays on.
		{
			rules: {
				'perfectionist/sort-array-includes': 'off',
				'perfectionist/sort-classes': 'off',
				'perfectionist/sort-decorators': 'off',
				'perfectionist/sort-enums': 'off',
				'perfectionist/sort-export-attributes': 'off',
				'perfectionist/sort-exports': 'off',
				'perfectionist/sort-heritage-clauses': 'off',
				'perfectionist/sort-import-attributes': 'off',
				'perfectionist/sort-interfaces': 'off',
				'perfectionist/sort-intersection-types': 'off',
				'perfectionist/sort-jsx-props': 'off',
				'perfectionist/sort-maps': 'off',
				'perfectionist/sort-modules': 'off',
				'perfectionist/sort-named-exports': 'off',
				'perfectionist/sort-named-imports': 'off',
				'perfectionist/sort-object-types': 'off',
				'perfectionist/sort-objects': 'off',
				'perfectionist/sort-sets': 'off',
				'perfectionist/sort-switch-case': 'off',
				'perfectionist/sort-union-types': 'off',
				'perfectionist/sort-variable-declarations': 'off',
			},
		},
		// Foreign collections are read through getRawCollection() from utils/collections.ts
		// Direct getCollection() here bypasses the raw-vs-enriched access path and its ordering contract
		{
			files: ['src/lib/collections/**/*.ts'],
			rules: {
				'no-restricted-syntax': [
					'error',
					...restrictedSyntaxDefaults,
					{
						message:
							'Use getRawCollection() from #lib/utils/collections.ts instead of getCollection() inside src/lib/collections.',
						selector: "CallExpression[callee.name='getCollection']",
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
			files: ['src/components/**/*'],
			languageOptions: {
				globals: {
					...Object.fromEntries(Object.keys(globals.node).map((key) => [key, 'off'])),
					...globals.browser,
				},
			},
			rules: {
				// This conflicts with how some client-side code is handled
				'unicorn/prefer-global-this': 'off',
			},
		},
		/**
		 * Native web components
		 */
		webComponentConfig,
		/**
		 * Astro
		 */
		...getAstroConfig({ a11y: 'strict' }),
	],
	{
		customGlobals: { mode: 'readonly' },
	},
);
