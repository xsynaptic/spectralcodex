import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

const linkIdRegex = /<Link\s[^>]*id="([^"]+)"/g;

interface LinkIdIssue {
	location: string;
	lineNumber: number;
	id: string | undefined;
}

function collectEntryLinkIdIssues(entry: DataStoreEntry, validIds: ReadonlySet<string>) {
	const body = entry.body;

	if (!body?.includes('<Link ')) return [];

	const location = entry.filePath ?? entry.id;

	const issues: Array<LinkIdIssue> = [];

	for (const match of body.matchAll(linkIdRegex)) {
		const id = match[1];

		if (id && validIds.has(id)) continue;

		issues.push({
			location,
			lineNumber: body.slice(0, match.index).split('\n').length,
			id,
		});
	}

	return issues;
}

export function collectLinkIdIssues(
	entries: Array<DataStoreEntry>,
	validTargets: Array<DataStoreEntry>,
) {
	const validIds = new Set(validTargets.map((entry) => entry.id));

	return entries.flatMap((entry) => collectEntryLinkIdIssues(entry, validIds));
}

export function checkLinkIds(entries: Array<DataStoreEntry>, validTargets: Array<DataStoreEntry>) {
	const issues = collectLinkIdIssues(entries, validTargets);
	let previousLocation: string | undefined;

	for (const issue of issues) {
		if (issue.location !== previousLocation) {
			console.log(chalk.red(`❌ ${issue.location}`));
			previousLocation = issue.location;
		}

		console.log(
			chalk.red(
				`   Line ${issue.lineNumber.toString()}: broken link ID "${issue.id ?? 'undefined'}"`,
			),
		);
	}

	if (issues.length === 0) {
		console.log(chalk.green('✓ Link IDs valid'));
	} else {
		console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} broken link ID(s)`));
	}

	return issues.length === 0;
}
