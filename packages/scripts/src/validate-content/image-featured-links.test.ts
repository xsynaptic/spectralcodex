import { describe, expect, test } from 'vitest';

import { validateImageFeaturedLinks } from '#validate-content/image-featured-links.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const validTargets = [makeEntry({ id: 'existing-place' })];

describe('validateImageFeaturedLinks', () => {
	test('passes when every featured image link names a known entry', () => {
		const entries = [
			makeEntry({
				data: { imageFeatured: [{ id: 'photo.jpg', link: 'existing-place' }] },
				id: 'a-post',
			}),
		];

		expect(validateImageFeaturedLinks(entries, validTargets)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'Featured image links resolve to existing content',
		});
	});

	test('flags a link to an unknown entry, naming the file', () => {
		const entries = [
			makeEntry({
				data: { imageFeatured: [{ id: 'photo.jpg', link: 'missing-place' }] },
				filePath: 'posts/a-post.mdx',
				id: 'a-post',
			}),
		];

		expect(validateImageFeaturedLinks(entries, validTargets)).toEqual({
			issues: [{ message: 'posts/a-post.mdx: unmatched imageFeatured link "missing-place"' }],
			status: 'fail',
			summary: 'Found 1 unmatched imageFeatured link(s)',
		});
	});

	test('ignores featured images without a link, in string and object form', () => {
		const entries = [
			makeEntry({ data: { imageFeatured: 'photo.jpg' }, id: 'a' }),
			makeEntry({ data: { imageFeatured: ['photo.jpg', { id: 'other.jpg' }] }, id: 'b' }),
		];

		expect(validateImageFeaturedLinks(entries, validTargets).status).toBe('pass');
	});
});
