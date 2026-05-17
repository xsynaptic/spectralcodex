#!/usr/bin/env tsx
import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

import { extractImageFeaturedIds, extractMdxImageIds } from '../shared/images';

export function checkImageFeaturedInBody(entries: Array<DataStoreEntry>) {
	const orphans: Array<{ file: string; missingIds: Array<string> }> = [];

	for (const entry of entries) {
		const featuredIds = extractImageFeaturedIds(entry.data);

		if (featuredIds.length === 0) continue;
		if (!entry.body) continue;

		const bodyIds = new Set(extractMdxImageIds(entry.body));
		const missingIds = featuredIds.filter((id) => !bodyIds.has(id));

		if (missingIds.length > 0) {
			orphans.push({ file: entry.filePath ?? entry.id, missingIds });
		}
	}

	if (orphans.length === 0) {
		console.log(chalk.green('✓ Featured images present in body content'));
		return true;
	}

	for (const { file, missingIds } of orphans) {
		console.log(chalk.red(`❌ ${file}: featured image(s) not in body: ${missingIds.join(', ')}`));
	}

	console.log(
		chalk.red(
			`❌ ${orphans.length.toString()} entries have featured images missing from body content`,
		),
	);

	return false;
}
