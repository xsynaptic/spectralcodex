import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

/**
 * Series items are plain strings because a series mixes collections, so `reference()` cannot serve them
 * An unresolved item is dropped silently at render (`series-utils.ts` filters the catalog lookup)
 */
export function checkSeriesItems(
	entries: Array<DataStoreEntry>,
	validTargets: Array<DataStoreEntry>,
) {
	const validIds = new Set(validTargets.map((entry) => entry.id));

	const issues: Array<{ location: string; id: string }> = [];

	for (const entry of entries) {
		const seriesItems = entry.data.seriesItems as Array<string> | undefined;

		if (!seriesItems) continue;

		for (const id of seriesItems) {
			if (!validIds.has(id)) issues.push({ location: entry.filePath ?? entry.id, id });
		}
	}

	if (issues.length === 0) {
		console.log(chalk.green('✓ Series items valid'));
		return true;
	}

	for (const { location, id } of issues) {
		console.log(chalk.red(`❌ ${location}: unknown series item "${id}"`));
	}

	console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} unknown series item(s)`));

	return false;
}
