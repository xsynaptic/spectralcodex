import { describe, expect, test } from 'vitest';

import { collectComponentIssues, validateMdxComponents } from './mdx.ts';
import { makeEntry } from './validate-test-utils.ts';

const rootPath = import.meta.dirname;

describe('collectComponentIssues', () => {
	test('accepts components carrying their required prop', () => {
		const body = [
			'Photographed at <Link id="wat-phra-kaew">Wat Phra Kaew</Link>.',
			'<Img src="temples/facade.jpg">A caption</Img>',
			'<Link id="bangkok" />',
		].join('\n');

		expect(collectComponentIssues(body)).toEqual([]);
	});

	test('flags a Link with no props at all', () => {
		expect(collectComponentIssues('See <Link>this label</Link>.')).toEqual([
			{
				context: 'See <Link>this label</Link>.',
				lineNumber: 1,
				message: 'Link component missing id prop',
			},
		]);
	});

	test('flags a Link carrying other props but no id', () => {
		const issues = collectComponentIssues('<Link class="anchor">text</Link>');

		expect(issues).toHaveLength(1);
		expect(issues[0]?.message).toBe('Link component missing id prop');
	});

	test('does not read a `data-id` prop as the `id` prop', () => {
		const issues = collectComponentIssues('<Link data-id="wat-arun">text</Link>');

		expect(issues).toHaveLength(1);
		expect(issues[0]?.message).toBe('Link component missing id prop');
	});

	test('flags an Img with alt but no src', () => {
		const issues = collectComponentIssues('<Img alt="A facade">caption</Img>');

		expect(issues).toHaveLength(1);
		expect(issues[0]?.message).toBe('Img component missing src prop');
	});

	test('reports the line the component sits on', () => {
		const body = ['Intro.', '', 'More prose.', '', '<Link>no id here</Link>'].join('\n');

		expect(collectComponentIssues(body)[0]?.lineNumber).toBe(5);
	});

	test('does not mistake a longer tag name for the one it checks', () => {
		expect(collectComponentIssues('<LinkList items="a" />')).toEqual([]);
	});

	test('orders issues across component types by line', () => {
		const body = ['<Img alt="first">a</Img>', '<Link>second</Link>'].join('\n');

		expect(collectComponentIssues(body).map((issue) => issue.lineNumber)).toEqual([1, 2]);
	});
});

describe('validateMdxComponents', () => {
	test('passes when every component is well formed', () => {
		const entries = [makeEntry({ body: '<Link id="wat-arun">text</Link>', id: 'a-post' })];

		expect(validateMdxComponents(entries, rootPath).status).toBe('pass');
	});

	test('reports the file and skips an entry with no body', () => {
		const entries = [
			makeEntry({ id: 'a-region' }),
			makeEntry({
				body: '<Link>text</Link>',
				filePath: 'collections/posts/a-post.mdx',
				id: 'a-post',
			}),
		];

		const result = validateMdxComponents(entries, rootPath);

		expect(result.status).toBe('fail');
		expect(result.issues).toHaveLength(1);
		expect(result.issues[0]?.message).toBe('collections/posts/a-post.mdx');
	});

	test('reports a line number that points at the file, not the body', () => {
		const entries = [
			makeEntry({
				body: 'Prose above the component.\n\n<Link>no id here</Link>\n',
				filePath: 'fixtures/offset-sample.mdx',
				id: 'a-post',
			}),
		];

		const result = validateMdxComponents(entries, rootPath);

		expect(result.issues[0]?.details?.[0]).toBe('Line 9: Link component missing id prop');
	});
});
