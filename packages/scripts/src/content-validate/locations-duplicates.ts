#!/usr/bin/env tsx
import chalk from 'chalk';
import { z } from 'zod';

import type { DataStoreEntry } from '../content-utils/data-store';

// Title fields to check for duplicates (kept DRY as array)
const TITLE_FIELDS = ['title', 'title_zh', 'title_ja'] as const;

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
	console.log(chalk.blue('🔍 Checking location duplicates'));

	const slugs = new Set<string>();
	const titles = new Map<string, Set<string>>(); // field -> values
	const addresses = new Set<string>();
	const googleMapsLinks = new Set<string>();

	// Initialize title sets
	for (const field of TITLE_FIELDS) {
		titles.set(field, new Set());
	}

	let duplicateCount = 0;

	for (const entry of entries) {
		const slug = z.string().optional().safeParse(entry.data.slug);

		if (slug.success && slug.data) {
			if (slugs.has(slug.data)) {
				console.log(chalk.red(`${entry.id}: duplicate slug "${slug.data}"`));
				duplicateCount++;
			} else {
				slugs.add(slug.data);
			}
		}

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

		// Check address
		const address = entry.data.address;

		if (typeof address === 'string') {
			if (addresses.has(address)) {
				console.log(chalk.red(`${entry.id}: duplicate address "${address}"`));
				duplicateCount++;
			} else {
				addresses.add(address);
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
