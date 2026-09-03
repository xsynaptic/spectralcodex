import { z } from 'zod';

import type { ContentEntry } from '../shared/astro-content.js';
import type { ValidationIssue } from './validation-result';

import { toValidationResult } from './validation-result';

const duplicateFields = [
	'title',
	'title_zh',
	'title_ja',
	'address',
	'address_zh',
	'address_ja',
] as const;

function getGoogleMapsLink(links: unknown): string | undefined {
	const parsed = z
		.union([z.string(), z.object({ url: z.string() })])
		.array()
		.safeParse(links);

	if (!parsed.success) return;

	for (const link of parsed.data) {
		const url = typeof link === 'string' ? link : link.url;

		if (url.includes('maps.app.goo.gl')) {
			return url;
		}
	}
	return;
}

// Records the value as seen, so the first occurrence is never the duplicate
function isDuplicate(seen: Set<string>, value: string): boolean {
	if (seen.has(value)) return true;

	seen.add(value);

	return false;
}

export function validateLocationsDuplicates(entries: Array<ContentEntry>) {
	const seenByField = new Map(duplicateFields.map((field) => [field, new Set<string>()]));
	const seenGoogleMapsLinks = new Set<string>();

	const issues: Array<ValidationIssue> = [];

	for (const entry of entries) {
		for (const field of duplicateFields) {
			const value = entry.data[field];

			if (typeof value !== 'string') continue;
			if (!isDuplicate(seenByField.get(field)!, value)) continue;

			issues.push({ message: `${entry.id}: duplicate ${field} "${value}"` });
		}

		const googleMapsLink = getGoogleMapsLink(entry.data.links);

		if (googleMapsLink && isDuplicate(seenGoogleMapsLinks, googleMapsLink)) {
			issues.push({ message: `${entry.id}: duplicate Google Maps link "${googleMapsLink}"` });
		}
	}

	return toValidationResult(issues, {
		pass: `No duplicates found (checked ${String(entries.length)} locations)`,
		fail: `Found ${String(issues.length)} duplicate(s)`,
	});
}
