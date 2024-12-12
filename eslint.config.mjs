// @ts-check -- ESLint still lacks support for config files in native TypeScript
import eslint from '@eslint/js';
import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import astroPlugin from 'eslint-plugin-astro';
// import mdxPlugin from 'eslint-plugin-mdx';
import simpleImportSortPlugin from 'eslint-plugin-simple-import-sort';
import unicornPlugin from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const config = tseslint.config(
	{
		ignores: ['**/node_modules', '**/dist', 'dist/**/*', '**/node_modules', '**/.astro'],
	},
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				// projectService: true, // Astro ecosystem tools can't use this yet; 2024Q4
				project: ['./tsconfig.json'],
				tsconfigRootDir: import.meta.dirname,
			},
			globals: {
				...globals.builtin,
				...globals.nodeBuiltin,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					ignoreRestSiblings: true,
				},
			],
			'@typescript-eslint/no-non-null-assertion': 'off',
		},
	},

	/**
	 * Simple import sort
	 */
	{
		plugins: {
			'simple-import-sort': simpleImportSortPlugin,
		},
		rules: {
			'simple-import-sort/imports': [
				'warn',
				{
					groups: [
						[String.raw`^@?\w`], // External packages
						[String.raw`^.*\u0000$`], // Type imports
						['^(components|components-react|data|lib|pages|pages-layouts|styles|types)(/.*|$)'], // Internal packages inside `src` folder
						[String.raw`^\u0000`], // Side effect imports
						[String.raw`^\.\.(?!/?$)`, String.raw`^\.\./?$`], // Parent imports; put `..` last
						[String.raw`^\./(?=.*/)(?!/?$)`, String.raw`^\.(?!/?$)`, String.raw`^\./?$`], // Other relative imports; put same folder imports and `.` last
						[String.raw`^.+\.s?css$`], // Style imports
					],
				},
			],
			'simple-import-sort/exports': 'warn',
		},
	},

	/**
	 * Unicorn
	 */
	unicornPlugin.configs['flat/recommended'],
	{
		rules: {
			'unicorn/filename-case': [
				'warn',
				{
					case: 'kebabCase',
					ignore: [String.raw`^(README|TODO)\.md$`],
				},
			],
			'unicorn/no-array-callback-reference': 'off', // Prefer this pattern for filtering/sorting content
			'unicorn/prevent-abbreviations': 'off', // This is annoying; I *like* abbreviations!
		},
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

	/**
	 * Astro support; with some help from...
	 * @reference - https://github.com/Princesseuh/erika.florist/blob/main/eslint.config.js
	 */
	...astroPlugin.configs.recommended,
	...astroPlugin.configs['jsx-a11y-strict'],

	// Remove some safety rules around `any` for various reasons
	// Astro.props isn't typed correctly in some contexts, so a bunch of things ends up being `any`
	{
		files: ['**/*.astro'],
		rules: {
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
		},
	},

	// Disable typed rules for scripts inside Astro files
	// https://github.com/ota-meshi/eslint-plugin-astro/issues/240
	{
		files: ['**/*.astro/*.ts'],
		languageOptions: {
			parserOptions: {
				// eslint-disable-next-line unicorn/no-null
				project: null,
			},
		},
		...tseslint.configs.disableTypeChecked,
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

	/**
	 * MDX; not ready for prime time
	 */
	{
		// ...mdxPlugin.flat,
		// files: ['./*.md', '**/*/*.md', '**/*/*.mdx'],
		/*
		languageOptions: {
			globals: {
				Img: 'readonly',
				ImgGroup: 'readonly',
				Link: 'readonly',
				Map: 'readonly',
				More: 'readonly',
			},
		},
		*/
		// ...tseslint.configs.disableTypeChecked,
	},
);

export default config;
