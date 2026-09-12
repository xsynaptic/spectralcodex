import type { ContentEntry } from '#shared/astro-content.ts';

import { extractImageFeaturedIds, extractMdxImageIds } from '#shared/images.ts';
import { toValidationResult } from '#validate-content/validation-result.ts';

export function validateImageFeaturedMissing(entries: Array<ContentEntry>) {
	const files = entries
		.filter((entry) => extractImageFeaturedIds(entry.data).length === 0)
		.filter((entry) => entry.body && extractMdxImageIds(entry.body).length > 0)
		.map((entry) => entry.filePath ?? entry.id);

	return toValidationResult(
		files.map((file) => ({ message: `${file}: body has images but no imageFeatured` })),
		{
			pass: 'Entries with body images all set imageFeatured',
			fail: `Found ${files.length.toString()} entries with body images but no imageFeatured`,
		},
	);
}
