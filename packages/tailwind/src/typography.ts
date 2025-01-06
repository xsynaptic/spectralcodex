/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Tailwind typing issue 2024Q4 */
import type { CustomThemeConfig, PluginUtils } from 'tailwindcss/types/config';

const proseOverrideStyle = [
	{
		p: {
			marginTop: 0,
		},
	},
	{
		'ul > li': {
			paddingInlineStart: 0,
		},
	},
	{
		ol: {
			paddingInlineStart: 0,
		},
	},
	{
		li: {
			marginTop: 0,
			marginLeft: '1rem',
			marginBottom: '0.5rem',
		},
	},
];

// eslint-disable-next-line @typescript-eslint/unbound-method -- Tailwind typing issue 2024Q4
export const typography = ({ theme }: PluginUtils) =>
	({
		primary: {
			css: {
				// Note: the body tone is lightened from the default
				'--tw-prose-body': theme('colors.primary.700'),
				'--tw-prose-headings': theme('colors.primary.900'),
				'--tw-prose-lead': theme('colors.primary.700'),
				'--tw-prose-links': theme('colors.primary.900'),
				'--tw-prose-bold': theme('colors.primary.900'),
				'--tw-prose-counters': theme('colors.accent.300'),
				'--tw-prose-bullets': theme('colors.accent.200'),
				'--tw-prose-hr': theme('colors.primary.300'),
				'--tw-prose-quotes': theme('colors.primary.900'),
				'--tw-prose-quote-borders': theme('colors.primary.300'),
				'--tw-prose-captions': theme('colors.primary.700'),
				'--tw-prose-code': theme('colors.primary.900'),
				'--tw-prose-pre-code': theme('colors.primary.100'),
				'--tw-prose-pre-bg': theme('colors.primary.900'),
				'--tw-prose-th-borders': theme('colors.primary.300'),
				'--tw-prose-td-borders': theme('colors.primary.200'),
				'--tw-prose-invert-body': theme('colors.primary.200'),
				'--tw-prose-invert-headings': theme('colors.white'),
				'--tw-prose-invert-lead': theme('colors.primary.300'),
				'--tw-prose-invert-links': theme('colors.white'),
				'--tw-prose-invert-bold': theme('colors.white'),
				'--tw-prose-invert-counters': theme('colors.primary.400'),
				'--tw-prose-invert-bullets': theme('colors.primary.600'),
				'--tw-prose-invert-hr': theme('colors.primary.700'),
				'--tw-prose-invert-quotes': theme('colors.primary.100'),
				'--tw-prose-invert-quote-borders': theme('colors.primary.700'),
				'--tw-prose-invert-captions': theme('colors.primary.400'),
				'--tw-prose-invert-code': theme('colors.white'),
				'--tw-prose-invert-pre-code': theme('colors.primary.300'),
				'--tw-prose-invert-pre-bg': 'rgb(0 0 0 / 50%)',
				'--tw-prose-invert-th-borders': theme('colors.primary.600'),
				'--tw-prose-invert-td-borders': theme('colors.primary.700'),
			},
		},
		DEFAULT: {
			css: [...proseOverrideStyle],
		},
		base: {
			css: [...proseOverrideStyle],
		},
		sm: {
			css: [...proseOverrideStyle],
		},
		md: {
			css: [...proseOverrideStyle],
		},
		lg: {
			css: [...proseOverrideStyle],
		},
		xl: {
			css: [...proseOverrideStyle],
		},
	}) satisfies Partial<CustomThemeConfig>;
