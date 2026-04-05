/**
 * @type {import('prettier').Config}
 */
export default {
	printWidth: 100,
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
	],
	tailwindStylesheet: './src/styles/main.css',
};
