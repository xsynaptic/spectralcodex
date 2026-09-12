import { describe, expect, test } from 'vitest';

import { validateImageFeaturedMissing } from '#validate-content/image-featured-missing.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('validateImageFeaturedMissing', () => {
	test('flags entries whose body renders an Img without imageFeatured', () => {
		const entries = [
			makeEntry({ id: 'a-post', filePath: 'posts/a-post.mdx', body: '<Img src="one.jpg" />' }),
			makeEntry({
				id: 'featured',
				data: { imageFeatured: 'one.jpg' },
				body: '<Img src="one.jpg" />',
			}),
			makeEntry({ id: 'prose-only', body: 'Prose only.' }),
		];

		expect(validateImageFeaturedMissing(entries)).toEqual({
			status: 'fail',
			summary: 'Found 1 entries with body images but no imageFeatured',
			issues: [{ message: 'posts/a-post.mdx: body has images but no imageFeatured' }],
		});
	});
});
