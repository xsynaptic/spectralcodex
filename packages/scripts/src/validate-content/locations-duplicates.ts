import type { ContentEntry, ValidationIssue } from '@xsynaptic/astro-scripts';

import { toValidationResult } from '@xsynaptic/astro-scripts';
import { z } from 'zod';

const duplicateFields = [
	'title',
	'title_zh',
	'title_ja',
	'address',
	'address_zh',
	'address_ja',
] as const;

export function validateLocationsDuplicates(entries: Array<ContentEntry>) {
	const seenByField = new Map(duplicateFields.map((field) => [field, new Set<string>()]));
	const seenGoogleMapsLinks = new Set<string>();

	const issues: Array<ValidationIssue> = [];

	for (const entry of entries) {
		for (const field of duplicateFields) {
			const value = entry.data[field];

			if (typeof value !== 'string') continue;
			if (!isDuplicate(seenByField.get(field)!, value)) continue;

			issues.push({ location: entry.id, message: `duplicate ${field} "${value}"` });
		}

		const googleMapsLink = getGoogleMapsLink(entry.data.links);

		if (googleMapsLink && isDuplicate(seenGoogleMapsLinks, googleMapsLink)) {
			issues.push({
				location: entry.id,
				message: `duplicate Google Maps link "${googleMapsLink}"`,
			});
		}
	}

	return toValidationResult(issues, {
		fail: `Found ${String(issues.length)} duplicate(s)`,
		pass: `No duplicates found (checked ${String(entries.length)} locations)`,
	});
}

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
