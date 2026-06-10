import type { Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx';
import type { Plugin, Transformer } from 'unified';

import { visit } from 'unist-util-visit';

// MDX renders inside-out, so a parent can't pass props to children at render time
// Before render this stamps container context onto each grouped Img and injects the image count
// It also validates authoring against the component contract
interface RemarkImgGroupOptions {
	imgComponentId?: string;
	imgGroupComponentId?: string;
	displayAttributeName?: string;
	contextAttributeName?: string;
	imageCountAttributeName?: string;
	columnsAttributeName?: string;
	layoutAttributeName?: string;
	defaultDisplay?: string;
}

const defaultSettings = {
	imgComponentId: 'Img',
	imgGroupComponentId: 'ImgGroup',
	displayAttributeName: 'display',
	contextAttributeName: 'context',
	imageCountAttributeName: 'imageCount',
	columnsAttributeName: 'columns',
	layoutAttributeName: 'layout',
	defaultDisplay: 'grid',
} satisfies RemarkImgGroupOptions;

const carouselDisplayId = 'carousel';
const validDisplayIds = new Set(['grid', carouselDisplayId]);
const fullLayoutId = 'full';

function hasAttribute(node: MdxJsxFlowElement, name: string): boolean {
	return node.attributes.some((attr) => attr.type === 'mdxJsxAttribute' && attr.name === name);
}

function getStringAttribute(node: MdxJsxFlowElement, name: string): string | undefined {
	const attribute = node.attributes.find(
		(attr): attr is MdxJsxAttribute => attr.type === 'mdxJsxAttribute' && attr.name === name,
	);

	return typeof attribute?.value === 'string' ? attribute.value : undefined;
}

function setStringAttribute(node: MdxJsxFlowElement, name: string, value: string): void {
	const attribute = node.attributes.find(
		(attr): attr is MdxJsxAttribute => attr.type === 'mdxJsxAttribute' && attr.name === name,
	);

	if (attribute) {
		attribute.value = value;
		return;
	}

	node.attributes.push({ type: 'mdxJsxAttribute', name, value });
}

const remarkImgGroup = function (options?: Readonly<RemarkImgGroupOptions> | null) {
	const settings = { ...defaultSettings, ...options };

	const transformer: Transformer<Root> = (tree, file) => {
		visit(tree, 'mdxJsxFlowElement', (groupNode) => {
			if (groupNode.name !== settings.imgGroupComponentId) return;

			const display =
				getStringAttribute(groupNode, settings.displayAttributeName) ?? settings.defaultDisplay;

			if (!validDisplayIds.has(display)) {
				file.fail(
					`<ImgGroup> "${settings.displayAttributeName}" must be one of ${[...validDisplayIds].join(', ')}, received "${display}"`,
					groupNode,
				);
			}

			if (display === carouselDisplayId && hasAttribute(groupNode, settings.columnsAttributeName)) {
				file.fail(
					`<ImgGroup> "${settings.columnsAttributeName}" has no effect on a carousel`,
					groupNode,
				);
			}

			// Full-bleed is carousel-only; a full-width grid would gutter images that touch the edge
			if (
				display !== carouselDisplayId &&
				getStringAttribute(groupNode, settings.layoutAttributeName) === fullLayoutId
			) {
				file.fail(`<ImgGroup> layout="${fullLayoutId}" is only valid on a carousel`, groupNode);
			}

			let imageCount = 0;

			for (const child of groupNode.children) {
				if (child.type === 'mdxJsxFlowElement' && child.name === settings.imgComponentId) {
					if (hasAttribute(child, settings.layoutAttributeName)) {
						file.fail(
							`<Img> "${settings.layoutAttributeName}" has no effect inside an <ImgGroup>; set it on the <ImgGroup> instead`,
							child,
						);
					}

					imageCount += 1;
					setStringAttribute(child, settings.contextAttributeName, display);

					continue;
				}

				file.fail(`<ImgGroup> may only contain <Img> children`, child);
			}

			if (imageCount === 0) {
				file.fail(`<ImgGroup> contains no <Img> children`, groupNode);
			}

			if (display === carouselDisplayId && imageCount < 2) {
				file.fail(
					`<ImgGroup> carousel needs at least two images, found ${String(imageCount)}`,
					groupNode,
				);
			}

			setStringAttribute(groupNode, settings.imageCountAttributeName, String(imageCount));
		});
	};

	return transformer;
} satisfies Plugin<[(Readonly<RemarkImgGroupOptions> | null | undefined)?], Root>;

export type { RemarkImgGroupOptions };

export { remarkImgGroup };
