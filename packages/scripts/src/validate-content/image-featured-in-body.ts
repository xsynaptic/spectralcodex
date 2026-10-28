import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { toValidationResult } from '@xsynaptic/astro-scripts';

import { getEntryImageIds } from '#shared/image-references.ts';

export function validateImageFeaturedInBody(entries: Array<ContentEntry>) {
	const orphans: Array<{ file: string; missingIds: Array<string> }> = [];

	for (const entry of entries) {
		const { body, featured } = getEntryImageIds(entry);

		if (featured.length === 0) continue;
		if (!entry.body) continue;

		const bodyIds = new Set(body);
		const missingIds = featured.filter((id) => !bodyIds.has(id));

		if (missingIds.length > 0) {
			orphans.push({ file: entry.filePath ?? entry.id, missingIds });
		}
	}

	return toValidationResult(
		orphans.map(({ file, missingIds }) => ({
			location: file,
			message: `featured image(s) not in body: ${missingIds.join(', ')}`,
		})),
		{
			fail: `Found ${orphans.length.toString()} entries with featured images missing from body content`,
			pass: 'Featured images present in body content',
		},
	);
}
