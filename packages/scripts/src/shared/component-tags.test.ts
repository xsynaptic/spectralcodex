import { describe, expect, test } from 'vitest';

import { findComponentTags, getTagProp } from './component-tags';

describe('findComponentTags', () => {
	test('matches a name exactly, so LinkList is not Link', () => {
		expect(findComponentTags('<LinkList items="a" />', ['Link'])).toEqual([]);
	});

	test('reads a self-closing tag and a tag with no props', () => {
		const tags = findComponentTags('<Link id="wat-arun" />\n<Link>text</Link>', ['Link']);

		expect(tags.map((tag) => tag.lineNumber)).toEqual([1, 2]);
		expect(tags.map((tag) => getTagProp(tag, 'id'))).toEqual(['wat-arun', undefined]);
	});

	test('reads a tag whose props span several lines', () => {
		const body = ['<Img', '\tsrc="temples/facade.jpg"', '\talt="A facade"', '/>'].join('\n');
		const tags = findComponentTags(body, ['Img']);

		expect(tags.map((tag) => tag.lineNumber)).toEqual([1]);
		expect(tags.map((tag) => getTagProp(tag, 'src'))).toEqual(['temples/facade.jpg']);
	});

	test('returns tags of every requested name in document order', () => {
		const body = ['<Img src="a.jpg" />', '<Link id="b" />'].join('\n');

		expect(findComponentTags(body, ['Img', 'Link']).map((tag) => tag.name)).toEqual([
			'Img',
			'Link',
		]);
	});
});

describe('getTagProp', () => {
	test('does not read `data-id` as the `id` prop', () => {
		const tags = findComponentTags('<Link data-id="wat-arun">text</Link>', ['Link']);

		expect(tags.map((tag) => getTagProp(tag, 'id'))).toEqual([undefined]);
	});

	test('reads a single-quoted value', () => {
		const tags = findComponentTags("<Link id='wat-arun'>text</Link>", ['Link']);

		expect(tags.map((tag) => getTagProp(tag, 'id'))).toEqual(['wat-arun']);
	});
});
