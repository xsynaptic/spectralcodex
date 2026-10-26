import { describe, expect, test } from 'vitest';

import { collectComponentIssues, validateMdxComponents } from '#validate-content/mdx.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

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

	test('flags a Link with no props, or other props but no id', () => {
		expect(collectComponentIssues('See <Link>this label</Link>.')).toEqual([
			{
				context: 'See <Link>this label</Link>.',
				lineNumber: 1,
				message: 'Link component missing id prop',
			},
		]);

		const issues = collectComponentIssues('<Link class="anchor">text</Link>');

		expect(issues).toHaveLength(1);
		expect(issues[0]?.message).toBe('Link component missing id prop');
	});

	test('flags an Img with alt but no src', () => {
		const issues = collectComponentIssues('<Img alt="A facade">caption</Img>');

		expect(issues).toHaveLength(1);
		expect(issues[0]?.message).toBe('Img component missing src prop');
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
