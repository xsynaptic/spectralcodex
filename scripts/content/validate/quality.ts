#!/usr/bin/env tsx
import chalk from 'chalk';

import { parseContentCollectionFiles } from '../utils';

export async function checkContentQuality(contentCollectionPaths: Record<string, string>) {
	let overallMismatchCount = 0;

	for (const contentCollectionPath of Object.values(contentCollectionPaths)) {
		console.log(chalk.blue('Checking for low quality content in ' + contentCollectionPath + '...'));

		const parsedFiles = await parseContentCollectionFiles(contentCollectionPath);

		if (parsedFiles.length === 0) {
			console.log(chalk.yellow('No MDX files found in specified collections.'));
			continue;
		}

		let mismatchCount = 0;

		for (const parsedFile of parsedFiles) {
			const imageFeatured = parsedFile.frontmatter.imageFeatured as string | undefined;
			const entryQuality = parsedFile.frontmatter.entryQuality as number | undefined;

			if (imageFeatured && entryQuality && entryQuality < 2) {
				console.log(chalk.red('❌ ' + parsedFile.filename));
				console.log(chalk.red('   ERROR: Image featured but entry quality is low'));
				mismatchCount++;
			}
		}

		console.log(chalk.blue('='.repeat(50)));
		console.log(chalk.blue('Total files checked: ' + parsedFiles.length.toString()));
		console.log(chalk.blue('Mismatches found: ' + mismatchCount.toString()));

		if (mismatchCount === 0) {
			console.log(chalk.green('🎉 All content is of high quality!'));
		} else {
			console.log(
				chalk.yellow('⚠️  Found ' + mismatchCount.toString() + ' file(s) with low quality content'),
			);
			overallMismatchCount += mismatchCount;
		}
	}

	// Return a boolean to control flow of the main script
	return overallMismatchCount === 0;
}
