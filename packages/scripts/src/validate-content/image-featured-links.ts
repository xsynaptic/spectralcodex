#!/usr/bin/env tsx
import { ImageFeaturedSchema } from '@spectralcodex/shared/schemas';
import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

function extractImageFeaturedLinks(frontmatter: Record<string, unknown>): Array<string> {
	const imageFeatured = frontmatter.imageFeatured;

	if (!imageFeatured) return [];

	const parsed = ImageFeaturedSchema.safeParse(imageFeatured);

	if (!parsed.success) return [];

	const data = parsed.data;

	if (typeof data === 'string') return [];

	const links: Array<string> = [];

	for (const item of data) {
		if (typeof item === 'object' && typeof item.link === 'string') {
			links.push(item.link);
		}
	}

	return links;
}

export function checkImageFeaturedLinks(
	entries: Array<DataStoreEntry>,
	validTargets: Array<DataStoreEntry>,
) {
	const validIds = new Set<string>();

	for (const entry of validTargets) {
		validIds.add(entry.id);
	}

	const unmatchedLinks: Array<{ file: string; link: string }> = [];

	for (const entry of entries) {
		const links = extractImageFeaturedLinks(entry.data);

		for (const link of links) {
			if (!validIds.has(link)) {
				unmatchedLinks.push({ file: entry.filePath ?? entry.id, link });
			}
		}
	}

	if (unmatchedLinks.length === 0) {
		console.log(chalk.green('✓ Featured image links resolve to existing content'));
		return true;
	}

	for (const { file, link } of unmatchedLinks) {
		console.log(chalk.red(`❌ ${file}: unmatched imageFeatured link "${link}"`));
	}

	console.log(
		chalk.yellow(`⚠️  Found ${unmatchedLinks.length.toString()} unmatched imageFeatured link(s)`),
	);

	return false;
}
