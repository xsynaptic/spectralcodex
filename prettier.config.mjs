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
		// Note: we don't use Prettier for MDX formatting; this is a backup in case extensions fail
		{
			files: ['*.mdx'],
			options: {
				parser: 'mdx',
				proseWrap: 'always',
			},
		},
	],
};
