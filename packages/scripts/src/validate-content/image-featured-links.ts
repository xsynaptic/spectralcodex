import type { ContentEntry } from '@xsynaptic/astro-scripts';

import { parseImageFeatured } from '#shared/image-references.ts';
import { toValidationResult } from '#validate-content/validation-result.ts';

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
			fail: `Found ${unmatchedLinks.length.toString()} unmatched imageFeatured link(s)`,
			pass: 'Featured image links resolve to existing content',
		},
	);
}

function extractImageFeaturedLinks(frontmatter: Record<string, unknown>): Array<string> {
	const data = parseImageFeatured(frontmatter);

	if (!data || typeof data === 'string') return [];

	const links: Array<string> = [];

	for (const item of data) {
		if (typeof item === 'object' && typeof item.link === 'string') {
			links.push(item.link);
		}
	}

	return links;
}
