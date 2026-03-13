// @ts-check
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkLintListItemIndent from 'remark-lint-list-item-indent';
import remarkPresetLintConsistent from 'remark-preset-lint-consistent';
import remarkPresetLintRecommended from 'remark-preset-lint-recommended';
import { defineConfig } from 'mdxlint';

export default defineConfig({
	plugins: [
		remarkGfm,
		[remarkFrontmatter, 'yaml'],
		remarkPresetLintConsistent,
		remarkPresetLintRecommended,
		[remarkLintListItemIndent, 'mixed'],
	],
	settings: {
		bullet: '-',
		emphasis: '*',
		listItemIndent: 'one',
		resourceLink: true,
	},
});
