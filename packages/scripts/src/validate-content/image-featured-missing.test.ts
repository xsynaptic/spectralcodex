import { describe, expect, test } from 'vitest';

import { validateImageFeaturedMissing } from '#validate-content/image-featured-missing.ts';
import { makeEntry } from '#validate-content/validate-test-utils.ts';

describe('validateImageFeaturedMissing', () => {
	test('flags entries whose body renders an Img without imageFeatured', () => {
		const entries = [
			makeEntry({ body: '<Img src="one.jpg" />', filePath: 'posts/a-post.mdx', id: 'a-post' }),
			makeEntry({
				body: '<Img src="one.jpg" />',
				data: { imageFeatured: 'one.jpg' },
				id: 'featured',
			}),
			makeEntry({ body: 'Prose only.', id: 'prose-only' }),
		];

		expect(validateImageFeaturedMissing(entries)).toEqual({
			issues: [{ message: 'posts/a-post.mdx: body has images but no imageFeatured' }],
			status: 'fail',
			summary: 'Found 1 entries with body images but no imageFeatured',
		});
	});
});
