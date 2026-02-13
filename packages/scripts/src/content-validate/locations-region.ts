#!/usr/bin/env tsx
import { RegionsSchema } from '@spectralcodex/shared/schemas';
import chalk from 'chalk';
import path from 'node:path';

import type { DataStoreEntry } from '../shared/data-store';

/**
 * Derive hierarchy from filePath
 * *e.g.* "packages/content/collections/locations/south-korea/busan/file.mdx"
 * → ["south-korea", "busan", "file"]
 */
function getHierarchy(filePath: string, collection: string): Array<string> {
	// Find the collection folder and get everything after it
	const collectionMarker = `collections/${collection}/`;
	const idx = filePath.indexOf(collectionMarker);

	if (idx === -1) return [];

	const relativePath = filePath.slice(idx + collectionMarker.length);
	const ext = path.extname(relativePath);

	return relativePath.replace(ext, '').split('/');
}

export function checkLocationsRegions(entries: Array<DataStoreEntry>) {
	let mismatchCount = 0;

	for (const entry of entries) {
		const regions = RegionsSchema.optional().parse(entry.data.regions);

		if (!regions?.[0]) {
			const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;
			console.log(chalk.red(`❌ ${filename}`));
			console.log(chalk.red('   ERROR: No regions field found'));
			continue;
		}

		const firstRegion = regions[0];
		const hierarchy = entry.filePath ? getHierarchy(entry.filePath, 'locations') : [];

		// The parent folder should match the first region
		const expectedRegion = hierarchy.at(-2) ?? 'unknown';

		if (firstRegion !== expectedRegion) {
			const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;
			console.log(chalk.red(`❌ ${filename}`));
			console.log(chalk.red(`   Expected region: ${expectedRegion}, Found: ${firstRegion}`));
			console.log(chalk.red(`   Directory path: ${hierarchy.join(' → ')}`));
			mismatchCount++;
		}
	}

	if (mismatchCount === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} location regions valid`));
		return true;
	} else {
		console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} region mismatch(es)`));
		return false;
	}
}
