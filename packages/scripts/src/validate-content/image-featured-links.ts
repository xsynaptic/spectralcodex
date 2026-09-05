import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';

import type { ContentEntry } from '#shared/astro-content.ts';

import { toValidationResult } from '#validate-content/validation-result.ts';

function extractImageFeaturedLinks(frontmatter: Record<string, unknown>): Array<string> {
	const imageFeatured = frontmatter.imageFeatured;

	if (!imageFeatured) return [];

	const parsed = ImageFeaturedSchema.safeParse(imageFeatured);

	if (!parsed.success) return [];

	const data = parsed.data;

	if (typeof data === 'string') return [];

	const links: Array<string> = [];

	for (const item of data) {
		if (typeof item === 'object' && typeof item.link === 'string') {
			links.push(item.link);
		}
	}

	return links;
}

export function validateImageFeaturedLinks(
	entries: Array<ContentEntry>,
	validTargets: Array<ContentEntry>,
) {
	const validIds = new Set<string>();

	for (const entry of validTargets) {
		validIds.add(entry.id);
	}

	const unmatchedLinks: Array<{ file: string; link: string }> = [];

	for (const entry of entries) {
		const links = extractImageFeaturedLinks(entry.data);

		for (const link of links) {
			if (!validIds.has(link)) {
				unmatchedLinks.push({ file: entry.filePath ?? entry.id, link });
			}
		}
	}

	return toValidationResult(
		unmatchedLinks.map(({ file, link }) => ({
			message: `${file}: unmatched imageFeatured link "${link}"`,
		})),
		{
			pass: 'Featured image links resolve to existing content',
			fail: `Found ${unmatchedLinks.length.toString()} unmatched imageFeatured link(s)`,
		},
	);
}
