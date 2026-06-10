import type { Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx';

import { createProcessor } from '@mdx-js/mdx';
import { visit } from 'unist-util-visit';
import { describe, expect, test } from 'vitest';

import { remarkImgGroup } from '../src/index.ts';

// Parse through the same compiler Astro uses (@mdx-js/mdx), not bare remark-mdx
const capturedTrees: Array<Root> = [];

// eslint-disable-next-line unicorn/consistent-function-scoping -- a remark plugin is a curried attacher
const captureTree = () => (tree: Root) => {
	capturedTrees.push(tree);
};

const processor = createProcessor({ remarkPlugins: [remarkImgGroup, captureTree] });

async function transform(input: string): Promise<Root> {
	capturedTrees.length = 0;

	await processor.process(input);

	const tree = capturedTrees.at(-1);

	if (!tree) throw new Error('remark tree was not captured');

	return tree;
}

function getAttribute(node: MdxJsxFlowElement, name: string): string | undefined {
	const attribute = node.attributes.find(
		(attr): attr is MdxJsxAttribute => attr.type === 'mdxJsxAttribute' && attr.name === name,
	);

	return typeof attribute?.value === 'string' ? attribute.value : undefined;
}

function findElements(tree: Root, name: string): Array<MdxJsxFlowElement> {
	const elements: Array<MdxJsxFlowElement> = [];

	visit(tree, 'mdxJsxFlowElement', (node) => {
		if (node.name === name) elements.push(node);
	});

	return elements;
}

function contexts(tree: Root): Array<string | undefined> {
	return findElements(tree, 'Img').map((image) => getAttribute(image, 'context'));
}

// Catalog-shaped fragments: self-closing, captioned, and layout-bearing images
const standaloneFragments = [
	['self-closing', '<Img src="a.jpg" />\n'],
	['captioned', '<Img src="a.jpg">A caption.</Img>\n'],
	['layout wide, self-closing', '<Img src="a.jpg" layout="wide" />\n'],
	['layout full, captioned', '<Img src="a.jpg" layout="full">A caption.</Img>\n'],
] as const;

describe('standalone images are left untouched', () => {
	for (const [label, input] of standaloneFragments) {
		test(label, async () => {
			const tree = await transform(input);

			expect(contexts(tree)).toEqual([undefined]);
		});
	}
});

describe('context injection', () => {
	test('stamps grid context on a captioned group by default', async () => {
		const tree = await transform(
			'<ImgGroup>\n  <Img src="a.jpg">A caption.</Img>\n  <Img src="b.jpg">B caption.</Img>\n</ImgGroup>\n',
		);

		expect(contexts(tree)).toEqual(['grid', 'grid']);
	});

	test('stamps grid context on a mixed self-closing and captioned group', async () => {
		const tree = await transform(
			'<ImgGroup>\n  <Img src="a.jpg" />\n  <Img src="b.jpg">B caption.</Img>\n</ImgGroup>\n',
		);

		expect(contexts(tree)).toEqual(['grid', 'grid']);
	});

	test('treats an explicit grid display like the default', async () => {
		const tree = await transform(
			'<ImgGroup display="grid">\n  <Img src="a.jpg" />\n  <Img src="b.jpg" />\n</ImgGroup>\n',
		);

		expect(contexts(tree)).toEqual(['grid', 'grid']);
	});

	test('stamps carousel context when display is carousel', async () => {
		const tree = await transform(
			'<ImgGroup display="carousel">\n  <Img src="a.jpg">A caption.</Img>\n  <Img src="b.jpg">B caption.</Img>\n</ImgGroup>\n',
		);

		expect(contexts(tree)).toEqual(['carousel', 'carousel']);
	});
});

describe('image count injection', () => {
	test('injects the count of child images onto the group', async () => {
		const tree = await transform(
			'<ImgGroup>\n  <Img src="a.jpg" />\n  <Img src="b.jpg">B caption.</Img>\n  <Img src="c.jpg" />\n</ImgGroup>\n',
		);
		const [group] = findElements(tree, 'ImgGroup');

		expect(group && getAttribute(group, 'imageCount')).toBe('3');
	});
});

describe('does not reject valid usage', () => {
	test('allows columns on a grid', async () => {
		const tree = await transform(
			'<ImgGroup columns={2}>\n  <Img src="a.jpg" />\n  <Img src="b.jpg" />\n</ImgGroup>\n',
		);

		expect(contexts(tree)).toEqual(['grid', 'grid']);
	});

	test('allows layout on the group itself', async () => {
		const tree = await transform(
			'<ImgGroup layout="wide">\n  <Img src="a.jpg">A caption.</Img>\n  <Img src="b.jpg">B caption.</Img>\n</ImgGroup>\n',
		);

		expect(contexts(tree)).toEqual(['grid', 'grid']);
	});

	test('allows a full-bleed carousel', async () => {
		const tree = await transform(
			'<ImgGroup display="carousel" layout="full">\n  <Img src="a.jpg">A caption.</Img>\n  <Img src="b.jpg">B caption.</Img>\n</ImgGroup>\n',
		);

		expect(contexts(tree)).toEqual(['carousel', 'carousel']);
	});
});

const invalidCases: Array<[string, string, RegExp]> = [
	[
		'an unknown display value',
		'<ImgGroup display="masonry">\n  <Img src="a.jpg" />\n  <Img src="b.jpg" />\n</ImgGroup>\n',
		/must be one of grid, carousel/,
	],
	[
		'columns on a carousel',
		'<ImgGroup display="carousel" columns={3}>\n  <Img src="a.jpg" />\n  <Img src="b.jpg" />\n</ImgGroup>\n',
		/"columns" has no effect on a carousel/,
	],
	[
		'full layout on a grid',
		'<ImgGroup layout="full">\n  <Img src="a.jpg" />\n  <Img src="b.jpg" />\n</ImgGroup>\n',
		/layout="full" is only valid on a carousel/,
	],
	[
		'layout on a grouped image',
		'<ImgGroup>\n  <Img src="a.jpg" layout="wide">A caption.</Img>\n  <Img src="b.jpg" />\n</ImgGroup>\n',
		/"layout" has no effect inside an <ImgGroup>/,
	],
	['an empty group', '<ImgGroup></ImgGroup>\n', /contains no <Img> children/],
	[
		'a carousel with fewer than two images',
		'<ImgGroup display="carousel">\n  <Img src="a.jpg">A caption.</Img>\n</ImgGroup>\n',
		/needs at least two images/,
	],
	[
		'a nested group',
		'<ImgGroup>\n  <ImgGroup>\n    <Img src="a.jpg" />\n    <Img src="b.jpg" />\n  </ImgGroup>\n</ImgGroup>\n',
		/may only contain <Img> children/,
	],
	[
		'prose inside a group',
		'<ImgGroup>\n  <Img src="a.jpg" />\n\n  Stray prose.\n\n  <Img src="b.jpg" />\n</ImgGroup>\n',
		/may only contain <Img> children/,
	],
	[
		'a non-image component inside a group',
		'<ImgGroup>\n  <Img src="a.jpg" />\n  <Link id="x">y</Link>\n</ImgGroup>\n',
		/may only contain <Img> children/,
	],
];

describe('rejects invalid markup', () => {
	for (const [label, input, message] of invalidCases) {
		test(label, async () => {
			await expect(transform(input)).rejects.toThrow(message);
		});
	}
});
