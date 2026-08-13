import chalk from 'chalk';
import path from 'node:path';

import type { DataStoreEntry } from '../shared/data-store';

import { toReferenceIds } from '../shared/data-store';

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

interface LocationRegionIssue {
	filename: string;
	expectedRegion: string;
	foundRegion: string;
	hierarchy: Array<string>;
}

export function collectLocationsRegionsIssues(entries: Array<DataStoreEntry>) {
	const issues: Array<LocationRegionIssue> = [];

	for (const entry of entries) {
		const firstRegion = toReferenceIds(entry.data.regions)[0];

		// A non-empty regions array is enforced by the locations schema
		if (!firstRegion) continue;

		const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;
		const hierarchy = entry.filePath ? getHierarchy(entry.filePath, 'locations') : [];

		// The parent folder should match the first region
		const expectedRegion = hierarchy.at(-2) ?? 'unknown';

		if (firstRegion !== expectedRegion) {
			issues.push({ filename, expectedRegion, foundRegion: firstRegion, hierarchy });
		}
	}

	return issues;
}

export function checkLocationsRegions(entries: Array<DataStoreEntry>) {
	const issues = collectLocationsRegionsIssues(entries);

	for (const issue of issues) {
		console.log(chalk.red(`❌ ${issue.filename}`));
		console.log(
			chalk.red(`   Expected region: ${issue.expectedRegion}, Found: ${issue.foundRegion}`),
		);
		console.log(chalk.red(`   Directory path: ${issue.hierarchy.join(' → ')}`));
	}

	if (issues.length === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} location regions valid`));
		return true;
	}
	console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} region mismatch(es)`));
	return false;
}
