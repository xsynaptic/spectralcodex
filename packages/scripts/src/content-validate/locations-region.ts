#!/usr/bin/env tsx
import chalk from 'chalk';
import { z } from 'zod';

import { parseContentFiles } from '../content-utils';

export async function checkLocationsRegions(locationsPath: string) {
	console.log(chalk.blue(`🔍 Checking location regions in ${locationsPath}`));

	const parsedFiles = await parseContentFiles(locationsPath);

	let mismatchCount = 0;

	for (const parsedFile of parsedFiles) {
		const regions = z.string().array().optional().parse(parsedFile.frontmatter.regions);

		if (!regions?.[0]) {
			console.log(chalk.red(`❌ ${parsedFile.filename}`));
			console.log(chalk.red('   ERROR: No regions field found'));
			continue;
		}

		const firstRegion = regions[0];

		// The parent folder should match the first region
		const expectedRegion = parsedFile.hierarchy.at(-2) ?? 'unknown';

		if (firstRegion !== expectedRegion) {
			console.log(chalk.red(`❌ ${parsedFile.filename}`));
			console.log(chalk.red(`   Expected region: ${expectedRegion}, Found: ${firstRegion}`));
			console.log(chalk.red(`   Directory path: ${parsedFile.hierarchy.join(' → ')}`));
			mismatchCount++;
		}
	}

	if (mismatchCount === 0) {
		console.log(
			chalk.green(`✓ All location regions valid! Checked: ${parsedFiles.length.toString()}`),
		);
		return true;
	} else {
		console.log(chalk.yellow(`⚠️  Found ${mismatchCount.toString()} region mismatch(es)`));
		return false;
	}
}
