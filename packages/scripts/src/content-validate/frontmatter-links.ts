#!/usr/bin/env tsx
import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

/**
 * Check that all shortform (bare string) links in frontmatter match a resource
 * Longform links (objects with title and url) are always valid and skipped
 */
export function checkFrontmatterLinks(
	collections: Array<[string, Array<DataStoreEntry>]>,
): boolean {
	const resourcesCollection = collections.find(([collection]) => collection === 'resources')?.[1];

	if (!resourcesCollection) {
		console.log(chalk.red('❌ Resources collection not found'));
		return false;
	}

	const resourcePatterns = resourcesCollection
		.map((entry) => ({
			id: entry.id,
			match: entry.data.match as string | Array<string> | undefined,
		}))
		.filter((resource) => resource.match !== undefined);

	const unmatchedLinks: Array<{ file: string; url: string }> = [];

	for (const [, entries] of collections) {
		for (const entry of entries) {
			const links = entry.data.links as Array<string | { url: string }> | undefined;

			if (!links) continue;

			for (const link of links) {
				if (typeof link !== 'string') continue;

				const hasMatch = resourcePatterns.some((resource) => {
					if (typeof resource.match === 'string') {
						return link.includes(resource.match);
					}

					return resource.match!.some((pattern) => link.includes(pattern));
				});

				if (!hasMatch) {
					unmatchedLinks.push({ file: entry.filePath ?? entry.id, url: link });
				}
			}
		}
	}

	if (unmatchedLinks.length === 0) {
		console.log(chalk.green('✓ All shortform frontmatter links match existing resources'));
		return true;
	}

	for (const { file, url } of unmatchedLinks) {
		console.log(chalk.red(`❌ ${file}: unmatched link "${url}"`));
	}

	console.log(
		chalk.yellow(`⚠️  Found ${unmatchedLinks.length.toString()} unmatched frontmatter link(s)`),
	);

	return false;
}
