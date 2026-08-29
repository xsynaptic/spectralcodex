import type { DataStoreEntry } from '../shared/data-store';

import { toValidationResult } from './validation-result';

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

export function validateLinkIds(
	entries: Array<DataStoreEntry>,
	validTargets: Array<DataStoreEntry>,
) {
	const issues = collectLinkIdIssues(entries, validTargets);
	const detailsByLocation = new Map<string, Array<string>>();

	for (const issue of issues) {
		const details = detailsByLocation.get(issue.location) ?? [];

		details.push(
			`Line ${issue.lineNumber.toString()}: broken link ID "${issue.id ?? 'undefined'}"`,
		);
		detailsByLocation.set(issue.location, details);
	}

	return toValidationResult(
		[...detailsByLocation].map(([location, details]) => ({ message: location, details })),
		{
			pass: 'Link IDs valid',
			fail: `Found ${issues.length.toString()} broken link ID(s)`,
		},
	);
}
