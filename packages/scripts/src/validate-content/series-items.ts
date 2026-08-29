import type { DataStoreEntry } from '../shared/data-store';

import { toValidationResult } from './validation-result';

/**
 * Series items are plain strings because a series mixes collections, so `reference()` cannot serve them
 * An unresolved item is dropped silently at render (`series-utils.ts` filters the catalog lookup)
 */
export function validateSeriesItems(
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

	return toValidationResult(
		issues.map(({ location, id }) => ({ message: `${location}: unknown series item "${id}"` })),
		{
			pass: 'Series items valid',
			fail: `Found ${issues.length.toString()} unknown series item(s)`,
		},
	);
}
