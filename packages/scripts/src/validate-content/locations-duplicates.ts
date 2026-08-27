import chalk from 'chalk';
import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store';

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

export function checkLocationsDuplicates(entries: Array<DataStoreEntry>) {
	const seenByField = new Map(duplicateFields.map((field) => [field, new Set<string>()]));
	const seenGoogleMapsLinks = new Set<string>();

	let duplicateCount = 0;

	for (const entry of entries) {
		for (const field of duplicateFields) {
			const value = entry.data[field];

			if (typeof value !== 'string') continue;
			if (!isDuplicate(seenByField.get(field)!, value)) continue;

			console.log(chalk.red(`❌ ${entry.id}: duplicate ${field} "${value}"`));
			duplicateCount++;
		}

		const googleMapsLink = getGoogleMapsLink(entry.data.links);

		if (googleMapsLink && isDuplicate(seenGoogleMapsLinks, googleMapsLink)) {
			console.log(chalk.red(`❌ ${entry.id}: duplicate Google Maps link "${googleMapsLink}"`));
			duplicateCount++;
		}
	}

	if (duplicateCount === 0) {
		console.log(chalk.green(`✓ No duplicates found (checked ${String(entries.length)} locations)`));

		return true;
	}

	console.log(chalk.yellow(`⚠️  Found ${String(duplicateCount)} duplicate(s)`));

	return false;
}
