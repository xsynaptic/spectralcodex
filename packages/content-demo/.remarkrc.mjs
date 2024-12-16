// @ts-check -- Check types in this file
/**
 * @typedef {import('unified').Preset} Preset
 */
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkLintListItemIndent from 'remark-lint-list-item-indent';
import remarkMdx from 'remark-mdx';
import remarkPresetLintConsistent from 'remark-preset-lint-consistent';
import remarkPresetLintRecommended from 'remark-preset-lint-recommended';

/** @type {Preset} */
const remarkConfig = {
	plugins: [
		remarkGfm,
		[remarkFrontmatter, 'yaml'],
		remarkMdx,
		remarkPresetLintConsistent,
		remarkPresetLintRecommended,
		[remarkLintListItemIndent, 'mixed'],
	],
	settings: {
		// @ts-expect-error -- Something strange going on here again
		bullet: '-',
		listItemIndent: 'tab',
		resourceLink: true,
	},
};

/** @type {Preset} */
export default remarkConfig;
