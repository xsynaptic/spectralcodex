import { describe, expect, test } from 'vitest';

import { collectLinkIdIssues, validateLinkIds } from '#validate-content/link-ids.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const rootPath = import.meta.dirname;

const validTargets = [makeEntry({ id: 'existing-post' })];

describe('collectLinkIdIssues', () => {
	test('accepts links that resolve to a known entry', () => {
		const entries = [makeEntry({ body: '<Link id="existing-post">text</Link>', id: 'a-post' })];

		expect(collectLinkIdIssues(entries, validTargets)).toEqual([]);
	});

	test('flags a dangling link id with its location and line number', () => {
		const entries = [
			makeEntry({
				body: 'intro\n\n<Link id="missing-post">text</Link>',
				filePath: 'posts/a-post.mdx',
				id: 'a-post',
			}),
		];

		expect(collectLinkIdIssues(entries, validTargets)).toEqual([
			{ id: 'missing-post', lineNumber: 3, location: 'posts/a-post.mdx' },
		]);
	});

	test('collects every broken link in a single body', () => {
		const body = [
			'<Link id="missing-one" />',
			'<Link id="existing-post" />',
			'<Link id="missing-two" />',
		].join('\n');
		const issues = collectLinkIdIssues([makeEntry({ body, id: 'a-post' })], validTargets);

		expect(issues.map((issue) => issue.id)).toEqual(['missing-one', 'missing-two']);
		expect(issues.map((issue) => issue.lineNumber)).toEqual([1, 3]);
	});

	test('skips entries whose body contains no Link component', () => {
		const entries = [makeEntry({ body: 'plain prose', id: 'a-post' }), makeEntry({ id: 'b-post' })];

		expect(collectLinkIdIssues(entries, validTargets)).toEqual([]);
	});

	test('reads a single-quoted id', () => {
		const entries = [makeEntry({ body: "<Link id='missing-post' />", id: 'a-post' })];

		expect(collectLinkIdIssues(entries, validTargets).map((issue) => issue.id)).toEqual([
			'missing-post',
		]);
	});

	test('does not read a `data-id` prop as a link id', () => {
		const entries = [makeEntry({ body: '<Link data-id="missing-post">text</Link>', id: 'a-post' })];

		expect(collectLinkIdIssues(entries, validTargets)).toEqual([]);
	});
});

describe('validateLinkIds', () => {
	test('groups every broken link in one entry under a single issue', () => {
		const body = ['<Link id="missing-one" />', '<Link id="missing-two" />'].join('\n');
		const result = validateLinkIds([makeEntry({ body, id: 'a-post' })], validTargets, rootPath);

		expect(result.issues).toEqual([
			{
				details: ['Line 1: broken link ID "missing-one"', 'Line 2: broken link ID "missing-two"'],
				message: 'a-post',
			},
		]);
	});

	test('reports a line number that points at the file, not the body', () => {
		const body = [
			'Prose above the component.',
			'',
			'<Link>no id here</Link>',
			'',
			'<Link id="a-missing-target">a dangling id</Link>',
			'',
		].join('\n');
		const entries = [makeEntry({ body, filePath: 'fixtures/offset-sample.mdx', id: 'a-post' })];

		const result = validateLinkIds(entries, validTargets, rootPath);

		expect(result.issues[0]?.details).toEqual(['Line 11: broken link ID "a-missing-target"']);
	});
});
