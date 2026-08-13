import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

import { getPublicId } from '../shared/data-store';

interface DuplicateIdIssue {
	id: string;
	locations: Array<string>;
}

/**
 * Entry IDs are globally unique across every collection
 * The link, source, and featured-image checks resolve targets against one flat ID set, so a collision would silently point at the wrong entry
 * A location override publishes a second ID into the same namespace, so both are claimed
 */
export function collectDuplicateIdIssues(entries: Array<DataStoreEntry>) {
	const locationsById = new Map<string, Array<string>>();

	for (const entry of entries) {
		const location = entry.filePath ?? entry.id;
		const publicId = getPublicId(entry);
		const ids = publicId === entry.id ? [entry.id] : [entry.id, publicId];

		for (const id of ids) {
			const claimed = locationsById.get(id);

			if (claimed) {
				claimed.push(location);
				continue;
			}

			locationsById.set(id, [location]);
		}
	}

	const issues: Array<DuplicateIdIssue> = [];

	for (const [id, locations] of locationsById) {
		if (locations.length > 1) issues.push({ id, locations });
	}

	return issues;
}

export function checkEntryIds(entries: Array<DataStoreEntry>) {
	const issues = collectDuplicateIdIssues(entries);

	if (issues.length === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} entry IDs unique`));
		return true;
	}

	for (const { id, locations } of issues) {
		console.log(chalk.red(`❌ duplicate entry ID "${id}"`));

		for (const location of locations) {
			console.log(chalk.red(`   ${location}`));
		}
	}

	console.log(chalk.yellow(`⚠️  Found ${issues.length.toString()} duplicate entry ID(s)`));

	return false;
}
