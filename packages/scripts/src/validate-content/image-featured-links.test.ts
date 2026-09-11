import { describe, expect, test } from 'vitest';

import { validateImageFeaturedLinks } from '#validate-content/image-featured-links.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

const validTargets = [makeEntry({ id: 'existing-place' })];

describe('validateImageFeaturedLinks', () => {
	test('passes when every featured image link names a known entry', () => {
		const entries = [
			makeEntry({
				id: 'a-post',
				data: { imageFeatured: [{ id: 'photo.jpg', link: 'existing-place' }] },
			}),
		];

		expect(validateImageFeaturedLinks(entries, validTargets)).toEqual({
			status: 'pass',
			summary: 'Featured image links resolve to existing content',
			issues: [],
		});
	});

	test('flags a link to an unknown entry, naming the file', () => {
		const entries = [
			makeEntry({
				id: 'a-post',
				filePath: 'posts/a-post.mdx',
				data: { imageFeatured: [{ id: 'photo.jpg', link: 'missing-place' }] },
			}),
		];

		expect(validateImageFeaturedLinks(entries, validTargets)).toEqual({
			status: 'fail',
			summary: 'Found 1 unmatched imageFeatured link(s)',
			issues: [{ message: 'posts/a-post.mdx: unmatched imageFeatured link "missing-place"' }],
		});
	});

	test('ignores featured images without a link, in string and object form', () => {
		const entries = [
			makeEntry({ id: 'a', data: { imageFeatured: 'photo.jpg' } }),
			makeEntry({ id: 'b', data: { imageFeatured: ['photo.jpg', { id: 'other.jpg' }] } }),
		];

		expect(validateImageFeaturedLinks(entries, validTargets).status).toBe('pass');
	});
});
