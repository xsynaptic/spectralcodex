import type { ContentEntry } from '#shared/astro-content.ts';

import { getEntryImageIds } from '#shared/image-references.ts';
import { toValidationResult } from '#validate-content/validation-result.ts';

export function validateImageFeaturedMissing(entries: Array<ContentEntry>) {
	const files = entries
		.filter((entry) => {
			const { body, featured } = getEntryImageIds(entry);

			return featured.length === 0 && body.length > 0;
		})
		.map((entry) => entry.filePath ?? entry.id);

	return toValidationResult(
		files.map((file) => ({ message: `${file}: body has images but no imageFeatured` })),
		{
			fail: `Found ${files.length.toString()} entries with body images but no imageFeatured`,
			pass: 'Entries with body images all set imageFeatured',
		},
	);
}
