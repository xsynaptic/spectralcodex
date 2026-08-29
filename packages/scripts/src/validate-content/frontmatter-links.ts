import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

interface FrontmatterLinkIssue {
	location: string;
	url: string;
}

function getResourcePatterns(resourceEntries: Array<DataStoreEntry>) {
	return resourceEntries.flatMap((entry) => {
		const match = entry.data.match as string | Array<string> | undefined;

		if (match === undefined) return [];

		return typeof match === 'string' ? [match] : match;
	});
}

// Longform links carry their own title and url, so only bare strings need a resource to match
function collectFrontmatterLinkIssues(
	entries: Array<DataStoreEntry>,
	resourceEntries: Array<DataStoreEntry>,
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

export function checkFrontmatterLinks(
	entries: Array<DataStoreEntry>,
	resourceEntries: Array<DataStoreEntry>,
): boolean {
	const issues = collectFrontmatterLinkIssues(entries, resourceEntries);

	if (issues.length === 0) {
		console.log(chalk.green('✓ All shortform frontmatter links match existing resources'));
		return true;
	}

	for (const { location, url } of issues) {
		console.log(chalk.red(`❌ ${location}: unmatched link "${url}"`));
	}

	console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} unmatched frontmatter link(s)`));

	return false;
}
