import type { ContentEntry } from '../shared/astro-content.js';

import { toValidationResult } from './validation-result';

interface SourceIdIssue {
	location: string;
	id: string;
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
		const sources = entry.data.sources as Array<string | object> | undefined;

		if (!sources) continue;

		for (const source of sources) {
			if (typeof source !== 'string') continue;

			if (!validIds.has(source)) {
				issues.push({ location: entry.filePath ?? entry.id, id: source });
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
		issues.map(({ location, id }) => ({ message: `${location}: unknown source ID "${id}"` })),
		{
			pass: 'Source IDs valid',
			fail: `Found ${issues.length.toString()} broken source ID(s)`,
		},
	);
}
