import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

interface SourceIdIssue {
	location: string;
	id: string;
}

/**
 * Check that all shortform (bare string) sources in frontmatter name an existing resource
 * Longform sources (inline objects) describe a resource with no entry of its own and are skipped
 */
export function collectSourceIdIssues(
	entries: Array<DataStoreEntry>,
	resourceEntries: Array<DataStoreEntry>,
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

export function checkSourceIds(
	entries: Array<DataStoreEntry>,
	resourceEntries: Array<DataStoreEntry>,
) {
	const issues = collectSourceIdIssues(entries, resourceEntries);

	if (issues.length === 0) {
		console.log(chalk.green('✓ Source IDs valid'));
		return true;
	}

	for (const { location, id } of issues) {
		console.log(chalk.red(`❌ ${location}: unknown source ID "${id}"`));
	}

	console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} broken source ID(s)`));

	return false;
}
