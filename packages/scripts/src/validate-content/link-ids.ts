import type { ContentEntry } from '#shared/astro-content.ts';
import type { ValidationIssue } from '#validate-content/validation-result.ts';

import { findComponentTags, getTagProp } from '#shared/component-tags.ts';
import { getBodyLineOffset } from '#validate-content/body-line-offset.ts';
import { toValidationResult } from '#validate-content/validation-result.ts';

interface LinkIdIssue {
	location: string;
	lineNumber: number;
	id: string;
}

function collectEntryLinkIdIssues(entry: ContentEntry, validIds: ReadonlySet<string>) {
	const body = entry.body;

	if (!body) return [];

	const location = entry.filePath ?? entry.id;

	const issues: Array<LinkIdIssue> = [];
	const tags = findComponentTags(body, ['Link']);

	for (const tag of tags) {
		const id = getTagProp(tag, 'id');

		// A Link with no id is the mdx check's finding, not this one's
		if (!id || validIds.has(id)) continue;

		issues.push({ location, lineNumber: tag.lineNumber, id });
	}

	return issues;
}

export function collectLinkIdIssues(
	entries: Array<ContentEntry>,
	validTargets: Array<ContentEntry>,
) {
	const validIds = new Set(validTargets.map((entry) => entry.id));

	return entries.flatMap((entry) => collectEntryLinkIdIssues(entry, validIds));
}

export function validateLinkIds(
	entries: Array<ContentEntry>,
	validTargets: Array<ContentEntry>,
	rootPath: string,
) {
	const validIds = new Set(validTargets.map((entry) => entry.id));
	const issues: Array<ValidationIssue> = [];

	let issueCount = 0;

	for (const entry of entries) {
		const entryIssues = collectEntryLinkIdIssues(entry, validIds);

		if (entryIssues.length === 0) continue;

		const lineOffset = getBodyLineOffset(entry, rootPath);

		issues.push({
			message: entry.filePath ?? entry.id,
			details: entryIssues.map(
				(issue) =>
					`Line ${(issue.lineNumber + lineOffset).toString()}: broken link ID "${issue.id}"`,
			),
		});

		issueCount += entryIssues.length;
	}

	return toValidationResult(issues, {
		pass: 'Link IDs valid',
		fail: `Found ${issueCount.toString()} broken link ID(s)`,
	});
}
