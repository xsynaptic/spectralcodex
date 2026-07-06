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

interface LocationRegionMissingIssue {
	type: 'missing-regions';
	filename: string;
}

interface LocationRegionMismatchIssue {
	type: 'mismatch';
	filename: string;
	expectedRegion: string;
	foundRegion: string;
	hierarchy: Array<string>;
}

type LocationRegionIssue = LocationRegionMissingIssue | LocationRegionMismatchIssue;

export function collectLocationsRegionsIssues(entries: Array<DataStoreEntry>) {
	const issues: Array<LocationRegionIssue> = [];

	for (const entry of entries) {
		const regions = RegionsSchema.optional().parse(entry.data.regions);
		const filename = entry.filePath ? path.basename(entry.filePath) : entry.id;

		if (!regions?.[0]) {
			issues.push({ type: 'missing-regions', filename });
			continue;
		}

		const firstRegion = regions[0];
		const hierarchy = entry.filePath ? getHierarchy(entry.filePath, 'locations') : [];

		// The parent folder should match the first region
		const expectedRegion = hierarchy.at(-2) ?? 'unknown';

		if (firstRegion !== expectedRegion) {
			issues.push({
				type: 'mismatch',
				filename,
				expectedRegion,
				foundRegion: firstRegion,
				hierarchy,
			});
		}
	}

	return issues;
}

export function checkLocationsRegions(entries: Array<DataStoreEntry>) {
	const issues = collectLocationsRegionsIssues(entries);

	for (const issue of issues) {
		console.log(chalk.red(`❌ ${issue.filename}`));

		if (issue.type === 'missing-regions') {
			console.log(chalk.red('   ERROR: No regions field found'));
			continue;
		}

		console.log(
			chalk.red(`   Expected region: ${issue.expectedRegion}, Found: ${issue.foundRegion}`),
		);
		console.log(chalk.red(`   Directory path: ${issue.hierarchy.join(' → ')}`));
	}

	// Missing regions are report-only; only mismatches fail the check
	const mismatchCount = issues.filter((issue) => issue.type === 'mismatch').length;

	if (mismatchCount === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} location regions valid`));
		return true;
	}
	console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} region mismatch(es)`));
	return false;
}
