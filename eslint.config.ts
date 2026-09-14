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
				'packages/content/{collections,media}/**/*',
				'**/temp/**/*',
			],
		},
		{
			rules: {
				complexity: ['warn', { max: 8, variant: 'modified' }],
				// The expanded form reads more clearly than ??=, ||=, and &&=
				'logical-assignment-operators': ['error', 'never'],
				// Catches genuinely tangled control flow; unlike `complexity` it ignores JSX ternaries
				'max-depth': ['warn', 3],
				'max-lines-per-function': ['warn', { max: 100, skipBlankLines: true, skipComments: true }],
				'max-params': ['warn', 3],
				'max-statements': ['warn', 25],
				// `WebSite` etc. intentionally mirror schema.org's canonical type names
				'unicorn/consistent-compound-words': 'off',
				// Conflicts with Remeda's sort function
				'unicorn/no-array-sort': 'off',
				// Refactor-heavy: wants nested loops extracted into functions
				'unicorn/no-break-in-nested-loop': 'off',
				// False positives: map glyph URLs, i18n tokens, and shell format strings use literal braces
				'unicorn/no-incorrect-template-string-interpolation': 'off',
			},
		},
		// Sort keys within each translation section instead of flattening the sections into one list
		{
			files: ['src/lib/i18n/**/*.ts'],
			rules: {
				'perfectionist/sort-objects': ['error', { partitionByComment: true, type: 'natural' }],
			},
		},
		// Ambient declarations mirror third-party signatures
		{
			files: ['**/*.d.ts'],
			rules: {
				'max-params': 'off',
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
		webComponentConfig,
		...getAstroConfig({ a11y: 'strict' }),
	],
	{
		customGlobals: { mode: 'readonly' },
	},
);
