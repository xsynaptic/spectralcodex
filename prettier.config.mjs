/**
 * @type {import('prettier').Config}
 */
export default {
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
	plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
	printWidth: 100,
	proseWrap: 'never',
	singleQuote: true,
	tailwindStylesheet: './src/styles/main.css',
	useTabs: true,
};
