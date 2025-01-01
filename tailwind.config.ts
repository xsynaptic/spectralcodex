import { backgroundImage, colors, fontFamily, typography } from '@spectralcodex/tailwind';
import typographyPlugin from '@tailwindcss/typography';

import type { Config } from 'tailwindcss';

export default {
	content: [
		'./(packages|src)/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
		'!./**/.astro-cache/**',
		'!./**/node_modules/**',
	],
	theme: {
		extend: {
			backgroundImage,
			colors,
			fontFamily,
			spacing: {
				small: '1rem',
				medium: '2rem',
				content: '60.25rem', // 964px = 900px + 4rem (for content padding)
			},
			typography,
			content: {
				bar: '"|"',
				bullet: '"\u2022"',
				chevron: '"\u203A"',
				dot: '"\u00B7"',
				slash: '"/"',
			},
		},
	},
	plugins: [typographyPlugin],
	safelist: [
		// Inserted by remark-rehype for use with the footnotes label
		'sr-only',
	],
} satisfies Config;
