import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

const LINK_ID_REGEX = /<Link\s[^>]*id="([^"]+)"/g;

interface LinkIdIssue {
	location: string;
	lineNumber: number;
	id: string | undefined;
}

export function collectLinkIdIssues(
	entries: Array<DataStoreEntry>,
	validTargets: Array<DataStoreEntry>,
) {
	const validIds = new Set<string>();

	for (const entry of validTargets) {
		validIds.add(entry.id);
	}

	const issues: Array<LinkIdIssue> = [];

	for (const entry of entries) {
		if (!entry.body?.includes('<Link ')) continue;

		LINK_ID_REGEX.lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = LINK_ID_REGEX.exec(entry.body)) !== null) {
			const id = match[1];

			if (!id || !validIds.has(id)) {
				const lineNumber = entry.body.slice(0, match.index).split('\n').length;

				issues.push({ location: entry.filePath ?? entry.id, lineNumber, id });
			}
		}
	}

	return issues;
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
