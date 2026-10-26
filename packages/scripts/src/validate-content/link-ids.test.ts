import { describe, expect, test } from 'vitest';

import { validateLinkIds } from '#validate-content/link-ids.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const rootPath = import.meta.dirname;

const validTargets = [makeEntry({ id: 'existing-post' })];

describe('validateLinkIds', () => {
	test('groups every broken link in one entry under a single issue, passing resolving ones', () => {
		const body = [
			'<Link id="missing-one" />',
			'<Link id="existing-post" />',
			'<Link id="missing-two" />',
		].join('\n');
		const result = validateLinkIds([makeEntry({ body, id: 'a-post' })], validTargets, rootPath);

		expect(result.issues).toEqual([
			{
				details: ['Line 1: broken link ID "missing-one"', 'Line 3: broken link ID "missing-two"'],
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
