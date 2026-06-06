/** @type {import('stylelint').Config} */
export default {
	extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
	plugins: ['stylelint-plugin-defensive-css', '@double-great/stylelint-a11y'],
	languageOptions: {
		syntax: {
			// Tailwind v4 CSS-first directives; we write these here to save on installing another plugin
			atRules: {
				apply: { prelude: '<any-value>' },
				theme: { prelude: '<any-value>' },
				source: { prelude: '<any-value>' },
				utility: { prelude: '<any-value>' },
				'custom-variant': { prelude: '<any-value>' },
			},
		},
	},
	rules: {
		'import-notation': 'string',
		// Tailwind v4 entrypoints legitimately place @import after @source/@custom-variant/@theme
		// eslint-disable-next-line unicorn/no-null -- Stylelint requires null to switch off an inherited rule
		'no-invalid-position-at-import-rule': null,
		'function-no-unknown': [true, { ignoreFunctions: ['theme', '--alpha', '--spacing'] }],
		'max-nesting-depth': [
			3,
			{ ignore: ['pseudo-classes'], ignoreAtRules: ['media', 'supports', 'container'] },
		],
		'color-named': 'never',
		// A curated subset of defensive CSS rules
		'defensive-css/no-mixed-vendor-prefixes': true,
		'defensive-css/no-unsafe-will-change': true,
		'defensive-css/require-background-repeat': true,
		'a11y/no-outline-none': true,
		'a11y/selector-pseudo-class-focus': true,
	},
	overrides: [
		{
			files: ['**/*.astro'],
			customSyntax: 'postcss-html',
		},
	],
	ignoreFiles: ['src/styles/map-component.css', 'src/styles/pagefind-component.css'],
	reportDescriptionlessDisables: true,
};
