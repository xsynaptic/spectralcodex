import path from 'node:path';

import type { ContentEntry } from '#shared/astro-content.ts';

import { toReferenceIds } from '#shared/entries.ts';

import { toValidationResult } from './validation-result.ts';

/**
 * Derive hierarchy from filePath
 * *e.g.* "packages/content/collections/locations/south-korea/busan/file.mdx"
 * → ["south-korea", "busan", "file"]
 */
function getHierarchy(filePath: string, collection: string): Array<string> {
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

export function collectLocationsRegionsIssues(entries: Array<ContentEntry>) {
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

export function validateLocationsRegions(entries: Array<ContentEntry>) {
	const issues = collectLocationsRegionsIssues(entries);

	return toValidationResult(
		issues.map((issue) => ({
			message: issue.filename,
			details: [
				`Expected region: ${issue.expectedRegion}, Found: ${issue.foundRegion}`,
				`Directory path: ${issue.hierarchy.join(' → ')}`,
			],
		})),
		{
			pass: `${entries.length.toString()} location regions valid`,
			fail: `Found ${issues.length.toString()} region mismatch(es)`,
		},
	);
}
