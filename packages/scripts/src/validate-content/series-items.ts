import type { ContentEntry } from '@xsynaptic/astro-scripts/astro';

import type { ValidationIssue } from '#validate-content/validation-result.ts';

import { toValidationResult } from '#validate-content/validation-result.ts';

/**
 * Series items are plain strings because a series mixes collections, so `reference()` cannot serve them
 * An unresolved item is dropped silently at render (`series-queries.ts` filters the catalog lookup)
 */
export function validateSeriesItems(
	entries: Array<ContentEntry>,
	validTargets: Array<ContentEntry>,
) {
	const validIds = new Set(validTargets.map((entry) => entry.id));

	const issues: Array<ValidationIssue> = [];

	for (const entry of entries) {
		const seriesItems = entry.data.seriesItems as Array<string> | undefined;

		if (!seriesItems) continue;

		for (const id of seriesItems) {
			if (validIds.has(id)) continue;

			issues.push({ message: `${entry.filePath ?? entry.id}: unknown series item "${id}"` });
		}
	}

	return toValidationResult(issues, {
		fail: `Found ${issues.length.toString()} unknown series item(s)`,
		pass: 'Series items valid',
	});
}
