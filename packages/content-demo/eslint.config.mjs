// @ts-check -- ESLint still lacks support for config files in native TypeScript
import * as eslintMdx from 'eslint-mdx';
import * as eslintPluginMdx from 'eslint-plugin-mdx';

export default [
	{
		ignores: ['**/node_modules', '**/.astro'],
	},
	{
		files: ['**/*.mdx'],
		...eslintPluginMdx.flat,
		languageOptions: {
			sourceType: 'module',
			ecmaVersion: 'latest',
			parser: eslintMdx,
			globals: {
				Img: 'readonly',
				ImgGroup: 'readonly',
				Link: 'readonly',
				Map: 'readonly',
				More: 'readonly',
				React: false,
			},
		},
		plugins: {
			mdx: eslintPluginMdx,
		},
	},
];
