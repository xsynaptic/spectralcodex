import { describe, expect, test } from 'vitest';

import { collectLinkIdIssues, validateLinkIds } from './link-ids';
import { makeEntry } from './validate-test-utils';

const validTargets = [makeEntry({ id: 'existing-post' })];

describe('collectLinkIdIssues', () => {
	test('accepts links that resolve to a known entry', () => {
		const entries = [makeEntry({ id: 'a-post', body: '<Link id="existing-post">text</Link>' })];

		expect(collectLinkIdIssues(entries, validTargets)).toEqual([]);
	});

	test('flags a dangling link id with its location and line number', () => {
		const entries = [
			makeEntry({
				id: 'a-post',
				filePath: 'posts/a-post.mdx',
				body: 'intro\n\n<Link id="missing-post">text</Link>',
			}),
		];

		expect(collectLinkIdIssues(entries, validTargets)).toEqual([
			{ location: 'posts/a-post.mdx', lineNumber: 3, id: 'missing-post' },
		]);
	});

	test('collects every broken link in a single body', () => {
		const body = [
			'<Link id="missing-one" />',
			'<Link id="existing-post" />',
			'<Link id="missing-two" />',
		].join('\n');
		const issues = collectLinkIdIssues([makeEntry({ id: 'a-post', body })], validTargets);

		expect(issues.map((issue) => issue.id)).toEqual(['missing-one', 'missing-two']);
		expect(issues.map((issue) => issue.lineNumber)).toEqual([1, 3]);
	});

	test('skips entries whose body contains no Link component', () => {
		const entries = [makeEntry({ id: 'a-post', body: 'plain prose' }), makeEntry({ id: 'b-post' })];

		expect(collectLinkIdIssues(entries, validTargets)).toEqual([]);
	});
});

describe('validateLinkIds', () => {
	test('groups every broken link in one entry under a single issue', () => {
		const body = ['<Link id="missing-one" />', '<Link id="missing-two" />'].join('\n');
		const result = validateLinkIds([makeEntry({ id: 'a-post', body })], validTargets);

		expect(result.issues).toEqual([
			{
				message: 'a-post',
				details: ['Line 1: broken link ID "missing-one"', 'Line 2: broken link ID "missing-two"'],
			},
		]);
	});
});
