import type { ContentEntry, ValidationIssue } from '@xsynaptic/astro-scripts';

import { toValidationResult } from '@xsynaptic/astro-scripts';
import { z } from 'zod';

const PointsSchema = z.array(z.record(z.string(), z.unknown())).min(2);

function getTitleFields(point: Record<string, unknown>) {
	return Object.entries(point).filter(
		(entry): entry is [string, string] =>
			(entry[0] === 'title' || entry[0].startsWith('title_')) && typeof entry[1] === 'string',
	);
}

function getEntryIssues(entry: ContentEntry, points: Array<Record<string, unknown>>) {
	const issues: Array<ValidationIssue> = [];
	const seenByField = new Map<string, Set<string>>();

	for (const point of points) {
		for (const [field, value] of getTitleFields(point)) {
			const seen = seenByField.get(field) ?? new Set<string>();
			const folded = value.trim().toLowerCase();

			seenByField.set(field, seen);

			if (seen.has(folded)) {
				issues.push({ message: `${entry.id}: duplicate Point ${field} "${value}"` });
				continue;
			}

			seen.add(folded);
		}
	}

	return issues;
}

export function validateLocationsPointTitles(entries: Array<ContentEntry>) {
	const issues: Array<ValidationIssue> = [];
	let checkedCount = 0;

	for (const entry of entries) {
		const points = PointsSchema.safeParse(entry.data.geometry);

		if (!points.success) continue;

		checkedCount++;
		issues.push(...getEntryIssues(entry, points.data));
	}

	return toValidationResult(issues, {
		fail: `Found ${String(issues.length)} duplicate Point title(s)`,
		pass: `No duplicate Point titles (checked ${String(checkedCount)} locations with several Points)`,
	});
}
