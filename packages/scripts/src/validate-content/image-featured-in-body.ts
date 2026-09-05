import type { ContentEntry } from '#shared/astro-content.ts';

import { extractImageFeaturedIds, extractMdxImageIds } from '#shared/images.ts';

import { toValidationResult } from './validation-result.ts';

export function validateImageFeaturedInBody(entries: Array<ContentEntry>) {
	const orphans: Array<{ file: string; missingIds: Array<string> }> = [];

	for (const entry of entries) {
		const featuredIds = extractImageFeaturedIds(entry.data);

		if (featuredIds.length === 0) continue;
		if (!entry.body) continue;

		const bodyIds = new Set(extractMdxImageIds(entry.body));
		const missingIds = featuredIds.filter((id) => !bodyIds.has(id));

		if (missingIds.length > 0) {
			orphans.push({ file: entry.filePath ?? entry.id, missingIds });
		}
	}

	return toValidationResult(
		orphans.map(({ file, missingIds }) => ({
			message: `${file}: featured image(s) not in body: ${missingIds.join(', ')}`,
		})),
		{
			pass: 'Featured images present in body content',
			fail: `Found ${orphans.length.toString()} entries with featured images missing from body content`,
		},
	);
}
