#!/usr/bin/env tsx
import chalk from 'chalk';

import { parseContentCollectionFiles } from '../content-utils';

export async function checkDivisionIds(regionsPath: string) {
	console.log(chalk.blue('Checking regions for missing divisionId...'));

	const regionsWithoutDivision: Array<string> = [];

	const parsedFiles = await parseContentCollectionFiles(regionsPath);

	for (const parsedFile of parsedFiles) {
		if (parsedFile.frontmatter.divisionId === undefined) {
			regionsWithoutDivision.push(parsedFile.relativePath);
		}
	}

	if (regionsWithoutDivision.length === 0) {
		console.log(chalk.green('✓ All regions have divisionId defined'));
		return true;
	} else {
		console.log(
			chalk.red(`✗ Found ${String(regionsWithoutDivision.length)} regions without divisionId:`),
		);
		for (const region of regionsWithoutDivision) {
			console.log(chalk.red(`  - ${region}`));
		}
		return false;
	}
}
