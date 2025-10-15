import type { Root } from 'mdast';
import type { MdxJsxAttribute } from 'mdast-util-mdx';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

// This plugin exists to work around the fact that MDX components render inside out
// We can't modify the contents of ImgGroup before rendering
// But parsing rendered output is wasteful
// Instead, we use this small remark plugin to adjust the prop as needed
interface RemarkImgGroupOptions {
	imgComponentId?: string;
	imgGroupComponentId?: string;
	layoutAttributeName?: string;
	layoutValue?: string;
}

const DEFAULT_SETTINGS = {
	imgComponentId: 'Img',
	imgGroupComponentId: 'ImgGroup',
	layoutValue: 'none',
	layoutAttributeName: 'layout',
} satisfies RemarkImgGroupOptions;

const plugin = ((options?) => {
	const settings = Object.assign({}, DEFAULT_SETTINGS, options);

	return (tree) => {
		visit(tree, 'mdxJsxFlowElement', (node) => {
			if (node.name === settings.imgGroupComponentId) {
				visit(node, 'mdxJsxFlowElement', (imgNode) => {
					if (imgNode.name === settings.imgComponentId) {
						const layoutAttribute = imgNode.attributes.find(
							(attr) =>
								attr.type === 'mdxJsxAttribute' && attr.name === settings.layoutAttributeName,
						) as MdxJsxAttribute | undefined;

						if (layoutAttribute) {
							layoutAttribute.value = settings.layoutValue;
						} else {
							imgNode.attributes.push({
								type: 'mdxJsxAttribute',
								name: settings.layoutAttributeName,
								value: settings.layoutValue,
							});
						}
					}
				});
			}
		});
	};
}) satisfies Plugin<[(Readonly<RemarkImgGroupOptions> | null | undefined)?], Root>;

export type { RemarkImgGroupOptions };

export { plugin as remarkImgGroupPlugin };

export default plugin;
