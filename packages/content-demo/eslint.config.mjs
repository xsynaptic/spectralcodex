// @ts-check -- ESLint still lacks support for config files in native TypeScript
import eslintMdx from 'eslint-mdx';
import mdxPlugin from 'eslint-plugin-mdx';

export default [
	{
		ignores: ['**/node_modules', '**/.astro'],
	},
	{
		files: ['**/*.mdx'],
		...mdxPlugin.flat,
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
			mdx: mdxPlugin,
		},
	},
];
