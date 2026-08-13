import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

type RegionParentIssue =
	| { location: string; reason: 'cycle'; chain: Array<string> }
	| { location: string; reason: 'not-found'; parent: string }
	| { location: string; reason: 'self' };

function formatIssue(issue: RegionParentIssue) {
	if (issue.reason === 'self') return `${issue.location}: parent references itself`;

	if (issue.reason === 'not-found') return `${issue.location}: parent "${issue.parent}" not found`;

	return `${issue.location}: parent chain forms a cycle (${issue.chain.join(' -> ')})`;
}

// A region `parent` must reference an existing region id, never itself, and never form a cycle
// A dangling parent silently detaches the region into its own root, corrupting ancestry, siblings, and cumulative counts
// A cycle drops every member out of the hierarchy's root-driven walk, so subtrees silently vanish from rollups
export function collectRegionsParentsIssues(entries: Array<DataStoreEntry>) {
	const regionIds = new Set(entries.map((entry) => entry.id));
	const issues: Array<RegionParentIssue> = [];

	// Self edges are excluded so the cycle walk doesn't re-report them
	const parentById = new Map<string, string>();

	for (const entry of entries) {
		const parent = entry.data.parent;

		if (typeof parent !== 'string') continue;

		const location = entry.filePath ?? entry.id;

		if (parent === entry.id) {
			issues.push({ location, reason: 'self' });
		} else if (regionIds.has(parent)) {
			parentById.set(entry.id, parent);
		} else {
			issues.push({ location, reason: 'not-found', parent });
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

		issues.push({ location, reason: 'cycle', chain: [...chain, entry.id] });
	}

	return issues;
}

export function checkRegionsParents(entries: Array<DataStoreEntry>) {
	const issues = collectRegionsParentsIssues(entries);

	if (issues.length === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} region parents valid`));
		return true;
	}
	for (const issue of issues) {
		console.log(chalk.red(`❌ ${formatIssue(issue)}`));
	}
	console.log(
		chalk.yellow(`⚠️  Found ${issues.length.toString()} region(s) with an invalid parent`),
	);
	return false;
}
