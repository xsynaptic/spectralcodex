import type { ESLint } from 'eslint';

import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import {
	getAstroConfig,
	getBrowserConfig,
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
				'.claude/**/*',
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
				// The shared config sets this before unicorn's recommended preset, which switches it back off
				'logical-assignment-operators': ['error', 'never'],
				// The shared config turns this off for a Remeda `R.sort` conflict the rule no longer has
				'unicorn/no-array-sort': 'error',
				// Refactor-heavy: wants nested loops extracted into functions
				'unicorn/no-break-in-nested-loop': 'off',
			},
		},
		// Sort keys within each translation section instead of flattening the sections into one list
		{
			files: ['src/lib/i18n/**/*.ts'],
			rules: {
				'perfectionist/sort-objects': ['error', { partitionByComment: true, type: 'natural' }],
				// Translation strings use literal `{token}` placeholders
				'unicorn/no-incorrect-template-string-interpolation': 'off',
			},
		},
		// Ambient declarations mirror third-party signatures
		{
			files: ['**/*.d.ts'],
			rules: {
				'max-params': 'off',
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
		// Map visitors still run browsers older than Chrome 110 and Safari 16
		{
			files: ['packages/react-map-component/src/**/*.{ts,tsx}'],
			ignores: ['**/*.test.{ts,tsx}'],
			rules: {
				'no-restricted-properties': [
					'error',
					...['toReversed', 'toSorted', 'toSpliced'].map((property) => ({
						message: 'Copy then mutate instead (`[...array].sort()`)',
						property,
					})),
				],
				'unicorn/no-array-reverse': 'off',
				'unicorn/no-array-sort': 'off',
			},
		},
		{
			files: ['packages/scripts/src/**/*.{ts,tsx}'],
			rules: {
				'no-console': 'error',
				'no-restricted-syntax': [
					'error',
					...restrictedSyntaxDefaults,
					{
						message: '`runCommand` owns exit codes; throw a `UserError` instead',
						selector: "CallExpression[callee.object.name='process'][callee.property.name='exit']",
					},
				],
			},
		},
		{
			files: ['src/**/*', 'packages/scripts/**/*'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: [
							{
								message:
									'Open images with `openImageSource` from `@xsynaptic/astro-image-pipeline/node` so photos taken sideways come out upright',
								name: 'sharp',
							},
						],
					},
				],
			},
		},
		getBrowserConfig(['src/components/**/*']),
		{
			files: ['tests/e2e/**/*', 'playwright.config.ts'],
			languageOptions: {
				globals: { ...globals.node, ...globals.browser },
			},
			rules: {
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
