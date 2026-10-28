import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { toValidationResult } from '@xsynaptic/astro-scripts';

import { getEntryImageIds } from '#shared/image-references.ts';

export function validateImageFeaturedMissing(entries: Array<ContentEntry>) {
	const files = entries
		.filter((entry) => {
			const { body, featured } = getEntryImageIds(entry);

			return featured.length === 0 && body.length > 0;
		})
		.map((entry) => entry.filePath ?? entry.id);

	return toValidationResult(
		files.map((file) => ({ location: file, message: 'body has images but no imageFeatured' })),
		{
			fail: `Found ${files.length.toString()} entries with body images but no imageFeatured`,
			pass: 'Entries with body images all set imageFeatured',
		},
	);
}
