import type { ContentEntry } from '#shared/astro-content.ts';

import { toValidationResult } from './validation-result.ts';

interface FrontmatterLinkIssue {
	location: string;
	url: string;
}

function getResourcePatterns(resourceEntries: Array<ContentEntry>) {
	return resourceEntries.flatMap((entry) => {
		const match = entry.data.match as string | Array<string> | undefined;

		if (match === undefined) return [];

		return typeof match === 'string' ? [match] : match;
	});
}

// Longform links carry their own title and url, so only bare strings need a resource to match
function collectFrontmatterLinkIssues(
	entries: Array<ContentEntry>,
	resourceEntries: Array<ContentEntry>,
) {
	const patterns = getResourcePatterns(resourceEntries);

	const issues: Array<FrontmatterLinkIssue> = [];

	for (const entry of entries) {
		const links = entry.data.links as Array<string | { url: string }> | undefined;

		if (!links) continue;

		for (const link of links) {
			if (typeof link !== 'string') continue;

			if (patterns.some((pattern) => link.includes(pattern))) continue;

			issues.push({ location: entry.filePath ?? entry.id, url: link });
		}
	}

	return issues;
}

export function validateFrontmatterLinks(
	entries: Array<ContentEntry>,
	resourceEntries: Array<ContentEntry>,
) {
	const issues = collectFrontmatterLinkIssues(entries, resourceEntries);

	return toValidationResult(
		issues.map(({ location, url }) => ({ message: `${location}: unmatched link "${url}"` })),
		{
			pass: 'All shortform frontmatter links match existing resources',
			fail: `Found ${issues.length.toString()} unmatched frontmatter link(s)`,
		},
	);
}
