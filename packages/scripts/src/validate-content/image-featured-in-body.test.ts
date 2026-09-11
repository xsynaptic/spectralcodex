import { describe, expect, test } from 'vitest';

import { validateImageFeaturedInBody } from '#validate-content/image-featured-in-body.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('validateImageFeaturedInBody', () => {
	test('passes when every featured image appears as an Img in the body', () => {
		const entries = [
			makeEntry({
				id: 'a-post',
				data: { imageFeatured: ['one.jpg', { id: 'two.jpg', hero: true }] },
				body: '<Img src="one.jpg" />\n\nProse.\n\n<Img src="two.jpg">Caption</Img>',
			}),
		];

		expect(validateImageFeaturedInBody(entries)).toEqual({
			status: 'pass',
			summary: 'Featured images present in body content',
			issues: [],
		});
	});

	test('flags the featured images the body never renders', () => {
		const entries = [
			makeEntry({
				id: 'a-post',
				filePath: 'posts/a-post.mdx',
				data: { imageFeatured: ['one.jpg', 'two.jpg'] },
				body: '<Img src="one.jpg" />',
			}),
		];

		expect(validateImageFeaturedInBody(entries)).toEqual({
			status: 'fail',
			summary: 'Found 1 entries with featured images missing from body content',
			issues: [{ message: 'posts/a-post.mdx: featured image(s) not in body: two.jpg' }],
		});
	});

	test('skips entries with no body or no featured images', () => {
		const entries = [
			makeEntry({ id: 'no-body', data: { imageFeatured: 'one.jpg' } }),
			makeEntry({ id: 'no-featured', body: 'Prose only.' }),
		];

		expect(validateImageFeaturedInBody(entries).status).toBe('pass');
	});
});
