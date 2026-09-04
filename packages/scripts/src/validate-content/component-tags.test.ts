import { describe, expect, test } from 'vitest';

import { findComponentTags, getBodyLineOffset, getTagProp } from './component-tags';
import { makeEntry } from './validate-test-utils';

const rootPath = import.meta.dirname;

// Mirrors fixtures/offset-sample.mdx, whose frontmatter and the blank line after it run six lines
const fixtureBody = 'Prose above the component.\n\n<Link>no id here</Link>\n';
const fixturePath = 'fixtures/offset-sample.mdx';

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

describe('getBodyLineOffset', () => {
	test('measures the frontmatter a body was stripped of', () => {
		const entry = makeEntry({ id: 'a-post', body: fixtureBody, filePath: fixturePath });

		expect(getBodyLineOffset(entry, rootPath)).toBe(6);
	});

	test('is zero for an entry with no file path', () => {
		expect(getBodyLineOffset(makeEntry({ id: 'a-post', body: fixtureBody }), rootPath)).toBe(0);
	});

	test('is zero for a file path that is not on disk', () => {
		const entry = makeEntry({ id: 'a-post', body: fixtureBody, filePath: 'fixtures/absent.mdx' });

		expect(getBodyLineOffset(entry, rootPath)).toBe(0);
	});

	test('is zero when the body is not found in the file', () => {
		const entry = makeEntry({
			id: 'a-post',
			body: 'prose that is not there',
			filePath: fixturePath,
		});

		expect(getBodyLineOffset(entry, rootPath)).toBe(0);
	});
});
