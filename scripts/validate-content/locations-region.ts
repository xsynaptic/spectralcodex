#!/usr/bin/env tsx
import chalk from 'chalk';
import { parseContentCollectionFiles } from 'scripts/validate-content/content-utils';

export async function checkLocationRegions(locationsPath: string) {
	console.log(chalk.blue('Checking for location/region mismatches...'));

	const parsedFiles = await parseContentCollectionFiles(locationsPath);

	let mismatchCount = 0;

	for (const parsedFile of parsedFiles) {
		const regions = parsedFile.frontmatter.regions as Array<string> | undefined;

		if (!regions?.[0]) {
			console.log(chalk.red('❌ ' + parsedFile.filename));
			console.log(chalk.red('   ERROR: No regions field found'));
			continue;
		}

		const firstRegion = regions[0];

		// The parent folder should match the first region
		const expectedRegion = parsedFile.hierarchy.at(-2) ?? 'unknown';

		if (firstRegion !== expectedRegion) {
			console.log(chalk.red('❌ ' + parsedFile.filename));
			console.log(chalk.red('   Expected region: ' + expectedRegion + ', Found: ' + firstRegion));
			console.log(chalk.red('   Directory path: ' + parsedFile.hierarchy.join(' → ')));
			mismatchCount++;
		}
	}

	console.log(chalk.blue('='.repeat(50)));
	console.log(chalk.blue('Total location files checked: ' + parsedFiles.length.toString()));
	console.log(chalk.blue('Region mismatches found: ' + mismatchCount.toString()));

	if (mismatchCount === 0) {
		console.log(chalk.green('🎉 All location regions match their directory structure!'));
	} else {
		console.log(
			chalk.yellow(
				'⚠️  Found ' + mismatchCount.toString() + ' location(s) with region/directory mismatches',
			),
		);
	}
}
