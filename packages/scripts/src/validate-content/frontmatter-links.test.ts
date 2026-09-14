import { describe, expect, test } from 'vitest';

import { validateFrontmatterLinks } from '#validate-content/frontmatter-links.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const resourceEntries = [
	makeEntry({ collection: 'resources', data: { match: 'wikipedia.org' }, id: 'wikipedia' }),
	makeEntry({
		collection: 'resources',
		data: { match: ['boch.gov.tw', 'nchdb.boch.gov.tw'] },
		id: 'heritage-bureau',
	}),
	makeEntry({ collection: 'resources', id: 'no-match' }),
];

describe('validateFrontmatterLinks', () => {
	test('passes when every bare link falls under a resource pattern', () => {
		const entries = [
			makeEntry({
				data: { links: ['https://zh.wikipedia.org/wiki/x', 'https://nchdb.boch.gov.tw/y'] },
				id: 'a-location',
			}),
		];

		expect(validateFrontmatterLinks(entries, resourceEntries)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'All shortform frontmatter links match existing resources',
		});
	});

	test('flags a bare link no resource claims, naming the file', () => {
		const entries = [
			makeEntry({
				data: { links: ['https://example.test/page'] },
				filePath: 'locations/a-location.mdx',
				id: 'a-location',
			}),
		];

		expect(validateFrontmatterLinks(entries, resourceEntries)).toEqual({
			issues: [{ message: 'locations/a-location.mdx: unmatched link "https://example.test/page"' }],
			status: 'fail',
			summary: 'Found 1 unmatched frontmatter link(s)',
		});
	});

	test('skips longform links, which carry their own title', () => {
		const entries = [
			makeEntry({
				data: { links: [{ title: 'A page', url: 'https://example.test/page' }] },
				id: 'a-location',
			}),
		];

		expect(validateFrontmatterLinks(entries, resourceEntries).status).toBe('pass');
	});
});
