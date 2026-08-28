/**
 * @type {import('prettier').Config}
 */
export default {
	printWidth: 100,
	proseWrap: 'never',
	singleQuote: true,
	useTabs: true,
	plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
	overrides: [
		{
			files: ['*.astro'],
			options: {
				parser: 'astro',
			},
		},
		{
			// Zed formats this as JSONC, which makes prettier add trailing commas the CLI then strips
			files: ['.zed/*.json'],
			options: {
				parser: 'json',
				trailingComma: 'none',
			},
		},
	],
	tailwindStylesheet: './src/styles/main.css',
};
