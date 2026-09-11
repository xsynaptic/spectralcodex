import { describe, expect, test } from 'vitest';

import { validateFrontmatterLinks } from '#validate-content/frontmatter-links.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const resourceEntries = [
	makeEntry({ id: 'wikipedia', collection: 'resources', data: { match: 'wikipedia.org' } }),
	makeEntry({
		id: 'heritage-bureau',
		collection: 'resources',
		data: { match: ['boch.gov.tw', 'nchdb.boch.gov.tw'] },
	}),
	makeEntry({ id: 'no-match', collection: 'resources' }),
];

describe('validateFrontmatterLinks', () => {
	test('passes when every bare link falls under a resource pattern', () => {
		const entries = [
			makeEntry({
				id: 'a-location',
				data: { links: ['https://zh.wikipedia.org/wiki/x', 'https://nchdb.boch.gov.tw/y'] },
			}),
		];

		expect(validateFrontmatterLinks(entries, resourceEntries)).toEqual({
			status: 'pass',
			summary: 'All shortform frontmatter links match existing resources',
			issues: [],
		});
	});

	test('flags a bare link no resource claims, naming the file', () => {
		const entries = [
			makeEntry({
				id: 'a-location',
				filePath: 'locations/a-location.mdx',
				data: { links: ['https://example.test/page'] },
			}),
		];

		expect(validateFrontmatterLinks(entries, resourceEntries)).toEqual({
			status: 'fail',
			summary: 'Found 1 unmatched frontmatter link(s)',
			issues: [{ message: 'locations/a-location.mdx: unmatched link "https://example.test/page"' }],
		});
	});

	test('skips longform links, which carry their own title', () => {
		const entries = [
			makeEntry({
				id: 'a-location',
				data: { links: [{ url: 'https://example.test/page', title: 'A page' }] },
			}),
		];

		expect(validateFrontmatterLinks(entries, resourceEntries).status).toBe('pass');
	});
});
