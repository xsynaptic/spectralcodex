import { describe, expect, test } from 'vitest';

import { validateImageFeaturedInBody } from '#validate-content/image-featured-in-body.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('validateImageFeaturedInBody', () => {
	test('passes when every featured image appears as an Img in the body', () => {
		const entries = [
			makeEntry({
				body: '<Img src="one.jpg" />\n\nProse.\n\n<Img src="two.jpg">Caption</Img>',
				data: { imageFeatured: ['one.jpg', { hero: true, id: 'two.jpg' }] },
				id: 'a-post',
			}),
		];

		expect(validateImageFeaturedInBody(entries)).toEqual({
			issues: [],
			status: 'pass',
			summary: 'Featured images present in body content',
		});
	});

	test('flags the featured images the body never renders', () => {
		const entries = [
			makeEntry({
				body: '<Img src="one.jpg" />',
				data: { imageFeatured: ['one.jpg', 'two.jpg'] },
				filePath: 'posts/a-post.mdx',
				id: 'a-post',
			}),
		];

		expect(validateImageFeaturedInBody(entries)).toEqual({
			issues: [{ message: 'posts/a-post.mdx: featured image(s) not in body: two.jpg' }],
			status: 'fail',
			summary: 'Found 1 entries with featured images missing from body content',
		});
	});

	test('skips entries with no body or no featured images', () => {
		const entries = [
			makeEntry({ data: { imageFeatured: 'one.jpg' }, id: 'no-body' }),
			makeEntry({ body: 'Prose only.', id: 'no-featured' }),
		];

		expect(validateImageFeaturedInBody(entries).status).toBe('pass');
	});
});
