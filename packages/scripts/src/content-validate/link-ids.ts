import chalk from 'chalk';

import type { DataStoreEntry } from '../shared/data-store';

const LINK_ID_REGEX = /<Link\s[^>]*id="([^"]+)"/g;

export function checkLinkIds(entriesByCollection: Array<[string, Array<DataStoreEntry>]>) {
	const validIds = new Set<string>();

	for (const [, entries] of entriesByCollection) {
		for (const entry of entries) {
			validIds.add(entry.id);
		}
	}

	let overallErrorCount = 0;

	for (const [, entries] of entriesByCollection) {
		for (const entry of entries) {
			if (!entry.body?.includes('<Link ')) continue;

			LINK_ID_REGEX.lastIndex = 0;
			let match: RegExpExecArray | null;
			let entryHeaderPrinted = false;

			while ((match = LINK_ID_REGEX.exec(entry.body)) !== null) {
				const id = match[1];

				if (!id || !validIds.has(id)) {
					if (!entryHeaderPrinted) {
						console.log(chalk.red(`❌ ${entry.filePath ?? entry.id}`));
						entryHeaderPrinted = true;
					}

					const lineNumber = entry.body.slice(0, match.index).split('\n').length;
					console.log(
						chalk.red(`   Line ${lineNumber.toString()}: broken link ID "${id ?? 'undefined'}"`),
					);
					overallErrorCount++;
				}
			}
		}
	}

	if (overallErrorCount === 0) {
		console.log(chalk.green('✓ Link IDs valid'));
	} else {
		console.log(chalk.yellow(`⚠️  Found ${overallErrorCount.toString()} broken link ID(s)`));
	}

	return overallErrorCount === 0;
}
