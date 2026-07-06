import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

// A region `parent` must reference an existing region id, never itself, and never form a cycle
// A dangling parent silently detaches the region into its own root, corrupting ancestry, siblings, and cumulative counts
// A cycle drops every member out of the hierarchy's root-driven walk, so subtrees silently vanish from rollups
export function collectRegionsParentsIssues(entries: Array<DataStoreEntry>) {
	const regionIds = new Set(entries.map((entry) => entry.id));
	const issues: Array<string> = [];

	// Self edges are excluded so the cycle walk doesn't re-report them
	const parentById = new Map<string, string>();

	for (const entry of entries) {
		const parent = entry.data.parent;

		if (typeof parent !== 'string') continue;

		const location = entry.filePath ?? entry.id;

		if (parent === entry.id) {
			issues.push(`${location} (parent references itself)`);
		} else if (regionIds.has(parent)) {
			parentById.set(entry.id, parent);
		} else {
			issues.push(`${location} (parent "${parent}" not found)`);
		}
	}

	// Walk each entry's parent chain; a return to the starting entry is a cycle, reported once per cycle
	const reportedCycles = new Set<string>();

	for (const entry of entries) {
		const seen = new Set<string>([entry.id]);
		const chain = [entry.id];
		let current = parentById.get(entry.id);

		while (current !== undefined && !seen.has(current)) {
			seen.add(current);
			chain.push(current);
			current = parentById.get(current);
		}

		// Chains that merely lead into a cycle are skipped; the cycle members report it
		if (current !== entry.id) continue;

		const cycleKey = [...chain].sort((idA, idB) => idA.localeCompare(idB)).join('|');

		if (reportedCycles.has(cycleKey)) continue;

		reportedCycles.add(cycleKey);

		const location = entry.filePath ?? entry.id;

		issues.push(`${location} (parent chain forms a cycle: ${[...chain, entry.id].join(' -> ')})`);
	}

	return issues;
}

export function checkRegionsParents(entries: Array<DataStoreEntry>) {
	const issues = collectRegionsParentsIssues(entries);

	if (issues.length === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} region parents valid`));
		return true;
	}
	console.log(chalk.red(`✗ Found ${issues.length.toString()} regions with invalid parent:`));
	for (const issue of issues) {
		console.log(chalk.red(`  - ${issue}`));
	}
	return false;
}
