#!/usr/bin/env tsx
import chalk from 'chalk';

import type { DataStoreEntry } from '../content-utils/data-store';

export function checkDivisionIds(entries: Array<DataStoreEntry>) {
	console.log(chalk.blue(`🔍 Checking division IDs in regions`));

	const regionsWithoutDivision: Array<string> = [];

	for (const entry of entries) {
		if (entry.data.divisionId === undefined) {
			regionsWithoutDivision.push(entry.filePath ?? entry.id);
		}
	}

	if (regionsWithoutDivision.length === 0) {
		console.log(chalk.green(`✓ ${entries.length.toString()} region divisionIds valid`));
		return true;
	} else {
		console.log(
			chalk.red(`✗ Found ${regionsWithoutDivision.length.toString()} regions without divisionId:`),
		);
		for (const region of regionsWithoutDivision) {
			console.log(chalk.red(`  - ${region}`));
		}
		return false;
	}
}
