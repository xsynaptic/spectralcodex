import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

// A region `parent` must reference an existing region id and never itself
// A dangling parent silently detaches the region into its own root, corrupting ancestry, siblings, and cumulative counts
export function collectRegionsParentsIssues(entries: Array<DataStoreEntry>) {
	const regionIds = new Set(entries.map((entry) => entry.id));
	const issues: Array<string> = [];

	for (const entry of entries) {
		const parent = entry.data.parent;

		if (typeof parent !== 'string') continue;

		const location = entry.filePath ?? entry.id;

		if (parent === entry.id) {
			issues.push(`${location} (parent references itself)`);
		} else if (!regionIds.has(parent)) {
			issues.push(`${location} (parent "${parent}" not found)`);
		}
	}

	return issues;
}

export function checkRegionsParents(entries: Array<DataStoreEntry>) {
	const issues = collectRegionsParentsIssues(entries);

	if (issues.length === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} region parents valid`));
		return true;
	}
	console.log(chalk.red(`✗ Found ${issues.length.toString()} regions with invalid parent:`));
	for (const issue of issues) {
		console.log(chalk.red(`  - ${issue}`));
	}
	return false;
}
