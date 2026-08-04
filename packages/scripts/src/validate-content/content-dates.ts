import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

const dateFields = ['dateCreated', 'dateUpdated'] as const;

// Dates are wall-clock days anchored to UTC; a day of slack covers authoring from any timezone
function getCutoffTime(now: Date) {
	return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 2);
}

export function collectContentDatesIssues(entries: Array<DataStoreEntry>, now = new Date()) {
	const cutoffTime = getCutoffTime(now);
	const issues: Array<string> = [];

	for (const entry of entries) {
		for (const field of dateFields) {
			const value = entry.data[field];

			if (!(value instanceof Date) || value.getTime() < cutoffTime) continue;

			issues.push(
				`${entry.filePath ?? entry.id} (${field} ${value.toISOString().slice(0, 10)} is in the future)`,
			);
		}
	}

	return issues;
}

export function checkContentDates(entries: Array<DataStoreEntry>) {
	const issues = collectContentDatesIssues(entries);

	if (issues.length === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} entry dates valid`));
		return true;
	}
	console.log(chalk.red(`✗ Found ${issues.length.toString()} future dates:`));
	for (const issue of issues) {
		console.log(chalk.red(`  - ${issue}`));
	}
	return false;
}
