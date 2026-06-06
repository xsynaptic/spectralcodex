import chalk from 'chalk';
import { z } from 'zod';

import type { DataStoreEntry } from '../shared/data-store';

// Title fields to check for duplicates (kept DRY as array)
const TITLE_FIELDS = ['title', 'title_zh', 'title_ja'] as const;
const ADDRESS_FIELDS = ['address', 'address_zh', 'address_ja'] as const;

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

export function checkLocationsDuplicates(entries: Array<DataStoreEntry>) {
	const titles = new Map<string, Set<string>>(); // field -> values
	const addresses = new Map<string, Set<string>>(); // field -> values
	const googleMapsLinks = new Set<string>();

	for (const field of TITLE_FIELDS) {
		titles.set(field, new Set());
	}
	for (const field of ADDRESS_FIELDS) {
		addresses.set(field, new Set());
	}

	let duplicateCount = 0;

	for (const entry of entries) {
		// Check title fields
		for (const field of TITLE_FIELDS) {
			const value = entry.data[field];

			if (typeof value === 'string') {
				const titleSet = titles.get(field)!;

				if (titleSet.has(value)) {
					console.log(chalk.red(`${entry.id}: duplicate ${field} "${value}"`));
					duplicateCount++;
				} else {
					titleSet.add(value);
				}
			}
		}

		// Check address fields
		for (const field of ADDRESS_FIELDS) {
			const value = entry.data[field];

			if (typeof value === 'string') {
				const addressSet = addresses.get(field)!;

				if (addressSet.has(value)) {
					console.log(chalk.red(`${entry.id}: duplicate ${field} "${value}"`));
					duplicateCount++;
				} else {
					addressSet.add(value);
				}
			}
		}

		// Check Google Maps link
		const googleMapsLink = getGoogleMapsLink(entry.data.links);

		if (googleMapsLink) {
			if (googleMapsLinks.has(googleMapsLink)) {
				console.log(chalk.red(`${entry.id}: duplicate Google Maps link "${googleMapsLink}"`));
				duplicateCount++;
			} else {
				googleMapsLinks.add(googleMapsLink);
			}
		}
	}

	if (duplicateCount === 0) {
		console.log(chalk.green(`✓ No duplicates found (checked ${String(entries.length)} locations)`));
		return true;
	}

	console.log(chalk.yellow(`⚠️  Found ${String(duplicateCount)} duplicate(s)`));
	return false;
}
