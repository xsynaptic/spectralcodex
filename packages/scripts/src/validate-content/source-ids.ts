import type { ContentEntry } from '#shared/astro-content.ts';

import { toValidationResult } from '#validate-content/validation-result.ts';

interface SourceIdIssue {
	id: string;
	location: string;
}

// Longform sources (inline objects) describe a resource with no entry of its own and are skipped
export function collectSourceIdIssues(
	entries: Array<ContentEntry>,
	resourceEntries: Array<ContentEntry>,
) {
	const validIds = new Set<string>();

	for (const entry of resourceEntries) {
		validIds.add(entry.id);
	}

	const issues: Array<SourceIdIssue> = [];

	for (const entry of entries) {
		const sources = entry.data.sources as Array<object | string> | undefined;

		if (!sources) continue;

		for (const source of sources) {
			if (typeof source !== 'string') continue;

			if (!validIds.has(source)) {
				issues.push({ id: source, location: entry.filePath ?? entry.id });
			}
		}
	}

	return issues;
}

export function validateSourceIds(
	entries: Array<ContentEntry>,
	resourceEntries: Array<ContentEntry>,
) {
	const issues = collectSourceIdIssues(entries, resourceEntries);

	return toValidationResult(
		issues.map(({ id, location }) => ({ message: `${location}: unknown source ID "${id}"` })),
		{
			fail: `Found ${issues.length.toString()} broken source ID(s)`,
			pass: 'Source IDs valid',
		},
	);
}
