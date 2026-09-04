import { describe, expect, test } from 'vitest';

import { getBodyLineOffset } from './body-line-offset';
import { makeEntry } from './validate-test-utils';

const rootPath = import.meta.dirname;

// Mirrors fixtures/offset-sample.mdx, whose frontmatter and the blank line after it run six lines
const fixtureBody = 'Prose above the component.\n\n<Link>no id here</Link>\n';
const fixturePath = 'fixtures/offset-sample.mdx';

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
